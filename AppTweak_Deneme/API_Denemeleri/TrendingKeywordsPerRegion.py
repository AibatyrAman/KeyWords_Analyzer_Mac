import requests
import pandas as pd

# RECIPE trending keywords per region
# The goal of this recipe is to provide trending keywords per region
# The generated CSV can easily be used to create charts

API_KEY = {"x-apptweak-key": "JyjSyfgl7NeQOYdMulFx3nUPN3g"}

def get_url(url, at_key):

    response = requests.get(url, headers=at_key)
    resp_dict = response.json()
    return resp_dict["result"]

# query parameters definition
START_DATE="2025-07-29"
END_DATE="2025-08-06"
LIMIT=100
DEVICE="iphone"
OFFSET=0

# regions - create the regions you're interested in
LATAM_LIST = ["pe","ar","uy","cl","co","ec","ve"]
ASIAN_LIST = ["th","mm","sg","vn","ph","id","my"]
EUROPE_LIST = ["be","it","fr","gb","de","nl","es"]
ANCIENDA_LIST = ["us", "mx", "br", "es", "ng", "fr"]


# select here the region you'd like to get trending keywords from 
region=ANCIENDA_LIST

# creating the dataframe that will contain the trending keywords for the selected region
df_all_country = pd.DataFrame(columns = ["keyword","country","occurrences","volume","difficulty"])

for country in region:
    url = f'https://public-api.apptweak.com/api/public/store/keywords/suggestions/trending.json?country={country}&device={DEVICE}&limit={LIMIT}&offset={OFFSET}&start_date={START_DATE}&end_date={END_DATE}'
    trending_kw_dict = get_url(url,API_KEY)
    df_per_country = pd.DataFrame(columns = ["keyword","country","occurrences"]) # need to do it because otherwise we're just populating an existing dataframe and it could cause errors 

    for _, kw_suggestion_array in trending_kw_dict.items():
        keywords = list(map(lambda x: x["keyword"], kw_suggestion_array))
        occurences = list(map(lambda x: x["occurrences"], kw_suggestion_array))
        volume = list(map(lambda x: x["volume"], kw_suggestion_array))
        difficulty = list(map(lambda x: x["difficulty"], kw_suggestion_array))
        df_per_country["keyword"] = keywords
        df_per_country["occurrences"] = occurences
        df_per_country["volume"] = volume
        df_per_country["difficulty"] = difficulty
    df_per_country["country"] = country
    df_all_country = df_all_country.append(df_per_country)   

df_all_country.reset_index(drop=True,inplace=True) # resetting the index 
df_all_country.index.name = 'index' # needs to be named to be imported in google data studio
df_all_country.to_csv(f'trending_keyword_suggestions_region.csv')