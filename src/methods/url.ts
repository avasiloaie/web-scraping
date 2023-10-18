import WebDriver, { ThenableWebDriver, WebElement, By } from "selenium-webdriver";
import { getSentiment } from "./sentiment";

export type WebScrapingResult = {
    title: string;
    short_description: string;
    image: string;
    href: string;
    sentiment: "positive" | "neutral" | "negative";
    words: number;
};

export async function analyzeUrl(driver: ThenableWebDriver): Promise<WebScrapingResult[]> {
    const articles: { [href: string]: WebScrapingResult & { webElement: WebElement } } = {};
    const titles: { [title: string]: true } = {};

    // matching article titles and images pointing to the same link
    const webElements = await driver.findElements(By.css("a"));
    await Promise.all(webElements.map(async webElement => {
        const href = await webElement.getAttribute("href");
        if (!href) {
            return;
        }
        const title = (await webElement.getText()).trim();
        if (!title.length) {
            return;
        }
        articles[href] = { title, short_description: "", image: "", href, sentiment: "neutral", words: 0, webElement };
        titles[title] = true;
    }));

    // only accepting articles with title
    await Promise.all(webElements.map(async webElement => {
        const href = await webElement.getAttribute("href");
        if (!articles[href]) {
            return;
        }
        try {
            const imgElement = await webElement.findElements(By.css("img"));
            articles[href].image = await imgElement[0].getAttribute("src");
        } catch {
            // maybe look at background-image: url("...")
        }
    }));

    // trying to find extra information (short_description) going up in the hierarchy
    // of the HTML elements using element of the title as the starting point
    const hrefs = Object.keys(articles);
    await Promise.all(hrefs.map(async href => {
        let webElement = articles[href].webElement;
        while (!articles[href].short_description.length) {
            try {
                webElement = await driver.executeScript("return arguments[0].parentNode;", webElement);
                
                // stopping when links to other articles are found
                const theseLinks = await webElement.findElements(By.css("a"));
                let couldNotFindShortDescription = false;
                await Promise.all(theseLinks.map(async link => {
                    const thisHref = await link.getAttribute("href");
                    if (thisHref !== href && hrefs.includes(thisHref)) {
                        couldNotFindShortDescription = true;
                    }
                }));
                if (couldNotFindShortDescription) {
                    break;
                }

                const childText: Array<string> = [];
                await Promise.all((await webElement.findElements(By.css("*"))).map(async child => {
                    const text = (await child.getText()).trim();
                    if (text.length && !titles[text]) {
                        childText.push(text);
                    }
                }));

                // selecting the longest text on the closest level in the hierarchy as the short_description
                if (!childText.length) {
                    continue;
                }
                articles[href].short_description = childText.reduce(function(a, b) {
                    return a.length > b.length ? a : b;
                });
            } catch {
                break;
            }
        }

        // removing the item from articles if no short_description is found
        if (!articles[href].short_description.length) {
            delete articles[href];
            return;
        }

        articles[href].sentiment = getSentiment(articles[href].short_description);

        const articleDriver = new WebDriver.Builder().forBrowser("chrome").build();
        try {
            await articleDriver.get(href);
            
            // similar to the short_description, starting from the title in order to match
            // only the body of the article and not other parts of the page
            let webElement = (await articleDriver.findElements(By.xpath("//*[text()='" + articles[href].title + "']")))[0];
            while (!articles[href].words) {
                webElement = await articleDriver.executeScript("return arguments[0].parentNode;", webElement);
                const childText: Array<string> = [];
                await Promise.all((await webElement.findElements(By.css("*"))).map(async child => {
                    const text = (await child.getText()).trim();
                    if (text.length && text !== articles[href].title) {
                        childText.push(text);
                    }
                }));

                // selecting the longest text on the closest level in the hierarchy as the body of the article
                if (!childText.length) {
                    continue;
                }
                const articleBody = childText.reduce(function(a, b) {
                    return a.length > b.length ? a : b;
                });
                articles[href].words = articleBody.split(/\s+/).length;

                // recalculating sentiment using the article body
                articles[href].sentiment = getSentiment(articles[href].short_description + " " + articleBody);
            }
        } catch {} finally {
            articleDriver.quit();
        }
    }));

    return Object.keys(articles).map(href => {
        const { title, short_description, image, sentiment, words } = articles[href];
        return { title, short_description, image, href, sentiment, words };
    });
}
