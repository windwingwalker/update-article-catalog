import { DynamoDBClient, PutItemCommand, PutItemCommandOutput } from "@aws-sdk/client-dynamodb";
import { HTTPResponse } from "./http-response"
import { marshall } from "@aws-sdk/util-dynamodb";
import { Article, ArticleCatalog, ArticleMetadata, PlainArticle, StatusCode } from "./model";
import axios, { AxiosResponse } from "axios";
import { ArticleCatalogNotFoundError, ArticleCatalogUploadError, ArticleUploadError, ArticleNotFoundError  } from "./error";

const dynamodbClient = new DynamoDBClient({ region: "us-east-1" });

const putArticleCatalog = async (articleCatalog: ArticleCatalog): Promise<number> => {
  const objectInDynamoDB = marshall(articleCatalog, {convertClassInstanceToMap: true})
  const command: PutItemCommand = new PutItemCommand({Item: objectInDynamoDB, TableName: "article-catalog"});
  const response: PutItemCommandOutput = await dynamodbClient.send(command);
  return response["$metadata"]["httpStatusCode"]
}

exports.lambdaHandler = async (event, context) => {
  /**
   * 1) Get article catalog
   * 2) Loop each article metadata within article catalog
   * 3) In each iteration of the loop, get article's views
   * 4) Update article catalog views of the article
   * 5) When loop end, update the whole article catalog to db
   */
  try {
    const articleCatalogResponse: AxiosResponse = await axios.get<ArticleCatalog>(`https://${process.env.API_ID}.execute-api.us-east-1.amazonaws.com/prod/article-catalog`)
    if (articleCatalogResponse["status"] == 404) throw new ArticleCatalogNotFoundError();
    var articleCatalog: ArticleCatalog = articleCatalogResponse["data"] as ArticleCatalog;

    for (var i = 0; i < articleCatalog["body"].length; i++){
      const firstPublished = articleCatalog["body"][i]["firstPublished"]
      const articleResponse: AxiosResponse = await axios.get(`https://${process.env.API_ID}.execute-api.us-east-1.amazonaws.com/prod/article?firstPublished=${firstPublished}`)
      if (articleResponse["status"] == 404) throw new ArticleNotFoundError(firstPublished);
      var article: Article = articleResponse["data"] as Article;

      articleCatalog["body"][i]["views"] = article["views"] 
    }

    const articleCatalogStatusCode: number = await putArticleCatalog(articleCatalog);
    if (articleCatalogStatusCode != 200) throw new ArticleCatalogUploadError();

    return new HTTPResponse(200, "Successfully Updated Index Views");
  } catch (err) {
    console.error(err);
    return new HTTPResponse(err["status"], JSON.stringify({"Error Message: ": err["message"]}));
  }
};
