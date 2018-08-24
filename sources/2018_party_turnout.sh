# This script downloads and processes data from the governor's race in the 
# 2018 Minnesota primary. It produces a JSON file of turnout counts by precinct
# and party that can be used for mapping in D3. Also adds in data from 2016 to
# flag whether Trump or Clinton won that given precinct, for filtering purposes.

# Questions: chase.davis@gmail.com

echo "Downloading 2018 precinct results ..." &&
echo "state;county_id;precinct_id;office_id;office_name;district;\
cand_order;cand_name;suffix;incumbent;party;precincts_reporting;\
precincts_voting;votes;votes_pct;votes_office" | \
  cat - <(wget -O - -o /dev/null https://electionresults.sos.state.mn.us/Results/MediaResult/114?mediafileid=39) > mn-gov-precinct-2018.csv &&

echo "Downloading 2016 precinct results ..." &&
echo "state;county_id;precinct_id;office_id;office_name;district;\
cand_order;cand_name;suffix;incumbent;party;precincts_reporting;\
precincts_voting;votes;votes_pct;votes_office" | \
  cat - <(wget -O - -o /dev/null https://electionresults.sos.state.mn.us/Results/MediaResult/100?mediafileid=52) > mn-gov-precinct-2016.csv &&

echo "Getting 2018 DFL totals ..." &&
cat mn-gov-precinct-2018.csv | \
  csv2json -r ";" | \
  ndjson-split | \
  ndjson-map '{"id":  d.county_id + d.precinct_id, "county_id": d.county_id, "precinct_id": d.precinct_id, "party": d.party, "votes": parseInt(d.votes_office)}' | \
  ndjson-filter 'd.party == "DFL"' | \
  uniq > 'dfl18.tmp.ndjson' &&

echo "Getting 2018 Republican totals ..." &&
cat mn-gov-precinct-2018.csv | \
  csv2json -r ";" | \
  ndjson-split | \
  ndjson-map '{"id":  d.county_id + d.precinct_id, "county_id": d.county_id, "precinct_id": d.precinct_id, "party": d.party, "votes": parseInt(d.votes_office)}' | \
  ndjson-filter 'd.party == "R"' | \
  uniq > 'r18.tmp.ndjson' &&

echo "Joining 2018 data ..." &&
ndjson-join 'd.id' <(cat dfl18.tmp.ndjson) <(cat r18.tmp.ndjson) | \
  ndjson-map '{"id":  d[0].county_id + d[0].precinct_id, "county_id": d[0].county_id, "precinct_id": d[0].precinct_id, "d": d[0].votes, "r": d[1].votes, "total": d[0].votes + d[1].votes, "diff": Math.abs(d[0].votes - d[1].votes), "majority": d[0].votes > d[1].votes ? "d" : d[0].votes == d[1].votes ? "even" : "r"}' > joined18.tmp.ndjson &&

echo "Getting 2016 DFL totals ..." &&
cat mn-gov-precinct-2016.csv | \
  csv2json -r ";" | \
  ndjson-split | \
  ndjson-map '{"id":  d.county_id + d.precinct_id, "county_id": d.county_id, "precinct_id": d.precinct_id, "party": d.party, "votes": parseInt(d.votes)}' | \
  ndjson-filter 'd.party == "DFL"' | \
  uniq > 'dfl16.tmp.ndjson' &&

echo "Getting 2016 Republican totals ..." &&
cat mn-gov-precinct-2016.csv | \
  csv2json -r ";" | \
  ndjson-split | \
  ndjson-map '{"id":  d.county_id + d.precinct_id, "county_id": d.county_id, "precinct_id": d.precinct_id, "party": d.party, "votes": parseInt(d.votes)}' | \
  ndjson-filter 'd.party == "R"' | \
  uniq > 'r16.tmp.ndjson' &&

echo "Joining 2016 data ..." &&
ndjson-join 'd.id' <(cat dfl16.tmp.ndjson) <(cat r16.tmp.ndjson) | \
  ndjson-map '{"id":  d[0].county_id + d[0].precinct_id, "winner2016": d[0].votes > d[1].votes ? "clinton" : d[0].votes == d[1].votes ? "even" : "trump"}' > joined16.tmp.ndjson &&

echo "Joining 2016 to 2018 ..."
ndjson-join --left 'd.id' <(cat joined18.tmp.ndjson) <(cat joined16.tmp.ndjson) | \
  ndjson-map '{"id":  d[0].id, "d": d[0].d, "r": d[0].r, "total": d[0].total, "diff": d[0].diff, "majority": d[0].majority, "winner2016": d[1] != null ? d[1].winner2016 : null}' | \
  ndjson-reduce > mn-turnout-by-party-2018.json

echo "Cleaning up ..." &&
rm *.tmp.ndjson &&
rm mn-gov-precinct-2018.csv &&
rm mn-gov-precinct-2016.csv

echo "Done!"