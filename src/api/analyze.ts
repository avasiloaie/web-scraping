import express, { Request, Response, Router } from "express";
import WebDriver from "selenium-webdriver";
import { analyzeUrl } from "../methods/url";

const router: Router = express.Router();

router.get("/analyze", async (request: Request, response: Response) => {
    const url = request.query.url?.toString();
    const driver = new WebDriver.Builder().forBrowser("chrome").build();
    try {
        await driver.get(url!);
    } catch {
        response.status(400);
        response.statusMessage = "Could not fetch the given URL: " + url;
    }
    try {
        response.setHeader("ContentType", "application/json");
        response.json(await analyzeUrl(driver));
    } catch {
        response.status(500);
    }
    driver.quit();
});

export default router;
