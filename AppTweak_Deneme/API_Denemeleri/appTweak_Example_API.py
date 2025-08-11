from typing import Dict, List, Tuple
from datetime import datetime
from dateutil.relativedelta import relativedelta
from functools import reduce
import requests
import pandas as pd

"""
The way this recipe works:
  1. We get the list of keyword suggestions for each app from:
  https://developers.apptweak.com/reference/keyword-suggestions-app
  2. Group keywords by whether they are branded or not:
  https://developers.apptweak.com/reference/keyword-metrics-current
  3. Get the app downloads for each keyword for the past month:
  https://developers.apptweak.com/reference/app-keyword-ranking-history
  4. Output a csv breakdown of the data.
"""


class AppDownloadsForTopKeywordSuggestions:
    def __init__(self) -> None:
        self.API_KEY = {"x-apptweak-key": "JyjSyfgl7NeQOYdMulFx3nUPN3g"}
        self.METADATA_ENDPOINT = "https://public-api.apptweak.com/api/public/store/apps/metadata.json"
        self.KW_SUGGESTIONS_ENDPOINT = "https://public-api.apptweak.com/api/public/store/keywords/suggestions/app.json"
        self.KW_METRICS_ENDPOINT = "https://public-api.apptweak.com/api/public/store/keywords/metrics/current.json"
        self.KW_RANKINGS_ENDPOINT = "https://public-api.apptweak.com/api/public/store/apps/keywords-rankings/history.json"

        # Device options: "iphone", "ipad" or "android"
        self.DEVICE = "iphone"

        # List the app ids you want data for here.
        # Warning: do not mix google play and iOS ids as that
        # wouldn't work and some of the requests will fail.
        self.APPS = [
            "6739486117",
            "1661709494",
            "6446172225",
            "6464476667"
        ]
        self._APPS_STRING = ",".join(self.APPS)

        # Sort options for the keywords-suggestions endpoint:
        # "score", "volume", or "rank"
        # See more: https://developers.apptweak.com/reference/keyword-suggestions-app
        self.SORT_OPTION = "score"

        # How many keyword suggestions would we like to get per app
        self.LIMIT = 20

        # Full list of country codes supported:
        # https://developers.apptweak.com/reference/country-codes
        self.COUNTRIES = ["us","mx","br"]

        # In this recipe, we care about whether a keyword metric is branded or not
        # for more information about the endpoint parameters and options visit:
        # https://developers.apptweak.com/reference/keyword-metrics-current
        self.KW_METRIC = "brand"

        # In this recipe, we care about the installs a suggested keyword gives
        # for more information about the endpoint parameters and options visit:
        # https://developers.apptweak.com/reference/app-keyword-ranking-history
        self.KW_RANKING_METRIC = "installs"

        # Set the start date to get the installs to 1 month ago
        self.START_DATE = (datetime.now() - relativedelta(months=1)).strftime(
            "%Y-%m-%d"
        )
        self.END_DATE = (datetime.now()).strftime("%Y-%m-%d")

        self.credit_cost = 0
        self.data = pd.DataFrame()


    # Function to get data from the API
    def get_url(_self, url: str, at_key: Dict) -> Tuple[int, Dict]:
        response = requests.get(url, headers=at_key)
        return (response.status_code, response.json())
    
    def concatenate_results(_self, results: List[Dict]) -> Dict:
        return {
            "result": reduce(lambda x, y: {**x, **y.get("result")}, results, {}),
            "metadata": {
                "request": {
                    "cost": sum([result.get("metadata").get("request").get("cost") for result in results])
                }
            },
        }

    def batch_requests(self, base_url: str, queries: List[str]) -> Tuple[Dict, List[Dict]]:
        results = []
        failed_queries = []
        for query in queries:
            status, response = self.get_url(base_url + query, self.API_KEY)
            if status == 200:
                results.append(response)
            else:
                failed_queries.append({"query": query, "status": status})
                print(f"Request for {query} failed with status code {status}:\n\t{response.get('error')}")

        return (self.concatenate_results(results), failed_queries)

    def get_app_metadata_per_country(self, country: str) -> Dict:
        max_apps_per_request = 5
        app_batches = [self.APPS[i:i + max_apps_per_request] for i in range(0, len(self.APPS), max_apps_per_request)]
        queries = list(map(lambda batch: f"?apps={','.join(batch)}&country={country}&device={self.DEVICE}", app_batches))
        app_metadata_dict, failed_queries = self.batch_requests(self.METADATA_ENDPOINT, queries)
        for query in failed_queries:
            status, query_str = query.get("status"), query.get("query")
            if status in (422, 500):
                failed_apps = app_batches[queries.index(query_str)]
                individual_queries = list(map(lambda app: f"?apps={app}&country={country}&device={self.DEVICE}", failed_apps))
                retry_metadata_dict, retry_failed_queries = self.batch_requests(self.METADATA_ENDPOINT, individual_queries)
                self.APPS = [app for app in self.APPS if not any(app in q.get("query") for q in retry_failed_queries)]
                app_metadata_dict = self.concatenate_results([app_metadata_dict, retry_metadata_dict])
        self.credit_cost += app_metadata_dict.get("metadata").get("request").get("cost")
        print(f"MetaData - The current credit cost is: {self.credit_cost}")
        return app_metadata_dict

    # Get keyword suggestions by country
    def get_keyword_suggestions_per_country(self, country: str) -> Dict:
        max_apps_per_request = 5
        app_batches = [self.APPS[i:i + max_apps_per_request] for i in range(0, len(self.APPS), max_apps_per_request)]
        queries = list(map(lambda batch: f"?apps={','.join(batch)}&sort={self.SORT_OPTION}&limit={self.LIMIT}&country={country}&device={self.DEVICE}", app_batches))
        kw_sug_dict, failed_queries = self.batch_requests(self.KW_SUGGESTIONS_ENDPOINT, queries)
        for query in failed_queries:
            status, query_str = query.get("status"), query.get("query")
            if status in (422, 500):
                failed_apps = app_batches[queries.index(query_str)]
                individual_queries = list(map(lambda app: f"?apps={app}&sort={self.SORT_OPTION}&limit={self.LIMIT}&country={country}&device={self.DEVICE}", failed_apps))
                retry_kw_sug_dict, retry_failed_queries = self.batch_requests(self.KW_SUGGESTIONS_ENDPOINT, individual_queries)
                self.APPS = [app for app in self.APPS if not any(app in q.get("query") for q in retry_failed_queries)]
                kw_sug_dict = self.concatenate_results([kw_sug_dict, retry_kw_sug_dict])
        self.credit_cost += kw_sug_dict.get("metadata").get("request").get("cost")
        print(f"Keyword Suggestions - The current credit cost is: {self.credit_cost}")
        return kw_sug_dict

    # Get brand information per keyword by country
    def get_keyword_metrics(self, keyword: str, country: str):
        query = f"?keywords={keyword}&metrics={self.KW_METRIC}&country={country}&device={self.DEVICE}"
        url = self.KW_METRICS_ENDPOINT + query
        _, resp_dict = self.get_url(url, self.API_KEY)
        self.credit_cost += resp_dict.get("metadata").get("request").get("cost")
        print(
            f"{self.KW_METRIC.capitalize()} - The current credit cost is: {self.credit_cost}"
        )
        return resp_dict

    # Gets installs for the specific app by country
    def get_keyword_installs_per_app(self, keyword: str, app: str, country: str):
        query = f"?apps={app}&keywords={keyword}&metrics={self.KW_RANKING_METRIC}&country={country}&device={self.DEVICE}&start_date={self.START_DATE}&end_date={self.END_DATE}"
        url = self.KW_RANKINGS_ENDPOINT + query
        _, resp_dict = self.get_url(url, self.API_KEY)
        self.credit_cost += resp_dict.get("metadata").get("request").get("cost")
        print(f"Keyword Installs - The current credit cost is: {self.credit_cost}")
        return resp_dict

    def sumInstalls(self, installs: List[Dict]):
      return sum(installEstimate["value"] or 0 for installEstimate in installs);

    def categorizeBrand(self, brand: Dict, app_id: str):
      brand_value = brand.get('value')
      if not brand_value:
        return 'generic'

      if str(brand_value.get('top_app_id')) == str(app_id):
        return 'own'

      return 'competitor'

    def export_to_csv(self):
        """"Writes the data to a csv"""
        self.data.reset_index(drop=True, inplace=True)
        self.data.index.name = "index"
        self.data.to_csv(
            "keyword_downloads_analysis.csv"
        )

    def fetch_data(self):
        for country in self.COUNTRIES:
            keyword_suggestions_dict = self.get_keyword_suggestions_per_country(country)
            metadata_dict = self.get_app_metadata_per_country(country)
            for app in self.APPS:
                app_title = metadata_dict.get("result").get(app).get("metadata").get("title")
                print (f" ------ Starting fetch for {country} - {app_title} ------- ")
                for keyword in keyword_suggestions_dict.get("result").get(app).get("suggestions"):
                    keyword = keyword.get("keyword")
                    brand = (
                        self.get_keyword_metrics(keyword, country)
                        .get("result")
                        .get(keyword)
                        .get("brand")
                    )
                    installs = (
                        self.get_keyword_installs_per_app(keyword, app, country)
                        .get("result")
                        .get(app)
                        .get(keyword)
                        .get("installs")
                    )
                    yield (country, app, app_title, keyword, brand, installs)

    def fetch_and_parse_data(self):
        for _i, (country, app, app_title, keyword, brand, installs) in enumerate(self.fetch_data()):
            to_insert = {
              "Country": country,
              "App Title": app_title,
              "App ID": app,
              "Keyword": keyword,
              "Estimated Installs": self.sumInstalls(installs),
              "Brand": self.categorizeBrand(brand, app)
            }

            row_df = pd.DataFrame([to_insert])
            self.data = pd.concat([self.data, row_df], ignore_index=True)

if __name__ == "__main__":
    recipe_parser = AppDownloadsForTopKeywordSuggestions()
    recipe_parser.fetch_and_parse_data()
    recipe_parser.export_to_csv()
