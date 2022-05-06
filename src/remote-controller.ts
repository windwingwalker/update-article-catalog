import { DynamoDBClient, PutItemCommand, PutItemCommandOutput } from "@aws-sdk/client-dynamodb";
import { HTTPResponse } from "./http-response"
import { marshall } from "@aws-sdk/util-dynamodb";
import { Article, ArticleIndex, ArticleMetadata, PlainArticle, StatusCode } from "./model";
import axios, { AxiosResponse } from "axios";
import { ArticleIndexNotFoundError, ArticleIndexUploadError, ArticleUploadError, ArticleNotFoundError  } from "./error";

const dynamodbClient = new DynamoDBClient({ region: "us-east-1" });

const putArticleIndex = async (articleIndex: ArticleIndex): Promise<number> => {
  const objectInDynamoDB = marshall(articleIndex, {convertClassInstanceToMap: true})
  const command: PutItemCommand = new PutItemCommand({Item: objectInDynamoDB, TableName: "article-index"});
  const response: PutItemCommandOutput = await dynamodbClient.send(command);
  return response.$metadata.httpStatusCode
}

exports.lambdaHandler = async (event, context) => {
  /**
   * 1) Get article index
   * 2) Loop each article metadata within article index
   * 3) In each iteration of the loop, get article's views
   * 4) Update article index views of the article
   * 5) When loop end, update the whole article index to db
   */
  try {
    const articleIndexResponse: AxiosResponse = await axios.get<ArticleIndex>(`https://${process.env.API_ID}.execute-api.us-east-1.amazonaws.com/prod/article-index`)
    if (articleIndexResponse["status"] == 404) throw new ArticleIndexNotFoundError();
    var articleIndex: ArticleIndex = articleIndexResponse["data"] as ArticleIndex;

    for (var i = 0; i < articleIndex["body"].length; i++){
      for (var j = 0; j < articleIndex["body"][i].length; j++){
        const id = articleIndex["body"][i][j]["firstPublished"]
        const articleResponse: AxiosResponse = await axios.get(`https://${process.env.API_ID}.execute-api.us-east-1.amazonaws.com/prod/article?id=${id}`)
        if (articleResponse["status"] == 404) throw new ArticleNotFoundError(id);
        var article: Article = articleResponse["data"] as Article;

        articleIndex["body"][i][j]["views"] = article["views"]
      }
    }

    const articleIndexStatusCode: number = await putArticleIndex(articleIndex);
    if (articleIndexStatusCode != 200) throw new ArticleIndexUploadError();

    return new HTTPResponse(200, "Successfully Updated Index Views");
  } catch (err) {
    console.error(err);
    return new HTTPResponse(err["status"], JSON.stringify({"Error Message: ": err["message"]}));
  }
};
