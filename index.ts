import express, { Request, Response , Application } from "express";
import dotenv from "dotenv";
import path from "path";
import analyze from "./src/api/analyze";

dotenv.config();

const app: Application = express();
const port = process.env.PORT;

app.use(express.static(path.join(__dirname, "public")))
app.get("/", (request: Request, response: Response) => {
  response.sendFile(`${__dirname}/public/index.html`);
});

app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`);
});
app.use("/api", analyze);

export default app;
