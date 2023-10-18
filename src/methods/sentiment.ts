const dictionary: { [word: string] : number } = {
    "positive": 1,
    "negative": -1,
    "beautiful": 1,
    "ugly": -1,
    "beauty": 1,
    "ugliness": -1,
    "good": 1,
    "bad": -1,
    "amaze": 1,
    "disappoint": -1,
    "upside": 1,
    "downside": -1,
    "happy": 1,
    "sad": -1,
    "happiness": 1,
    "sadness": -1,
    "perfect": 1,
    "broken": -1,
    "rich": 1,
    "poor": -1,
    "full": 1,
    "empty": -1,
    "benefit": 1,
    "disadvantage": -1,
    "simple": 1,
    "complicated": -1,
    "like": 1,
    "dislike": -1,
    "joy": 1,
    "agony": -1
}

export function getSentiment(text: string): "positive" | "neutral" | "negative" {
    let counter = 0;
    const words = text.split(/\s+/);
    words.forEach(word => {
        let w = word.replace(/\W/g, '').toLowerCase();
        let value = dictionary[w];
        // handling some common terminations if no match was found immediately
        if (value === undefined && w.endsWith("s")) {
            w = w.substring(0, w.length - 1);
        }
        value = dictionary[w];
        if (value === undefined && w.endsWith("ing")) {
            w = w.substring(0, w.length - 3);
            value = dictionary[w];
            if (value === undefined) {
                value = dictionary[w + "e"];
            }
        }
        if (value !== undefined) {
            counter += value;
        }
    });
    // balancing the sentiment with the word count
    const sentiment = 25 * counter / words.length;
    if (sentiment <= -0.5) {
        return "negative";
    } else if (sentiment >= 0.5) {
        return "positive";
    }
    return "neutral";
}
