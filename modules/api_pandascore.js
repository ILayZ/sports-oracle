/*jslint node: true */
"use strict";
const moment = require('moment');
const request = require('request');
const calendar = require('./calendar.js');
const conf = require('byteballcore/conf.js');
const commons = require('./commons.js');
const notifications = require('./notifications.js');

var reloadInterval = 1000*3600*24;
var blackListedChampionships=[466];
var blackListedVideogames=['PUBG','CS:GO']; // no data yet
var apikey = '?token=' + conf.pandascoreApiKey;

//https://api.pandascore.co/videogames


function getAllVideogamesAndPushIntoCalendar(){

	getAllVideogamesFromPandascore(blackListedVideogames,function(arrVideogames) {
		getCurrentChampionshipsForVideogame(blackListedChampionships,function(arrCurrentChampionShips) {
			arrCurrentChampionShips.forEach(function(currentChampionShip) {
				getFixturesAndPushIntoCalendar(currentChampionShip.category, currentChampionShip.championship, currentChampionShip.url);
			});
		});
	});
}

function getAllVideogamesFromPandascore(blacklist, handle) {
	var arrVideogames = [];
	request({
		url: 'https://api.pandascore.co/videogames' + apikey,
		headers: {
			'X-Auth-Token': conf.pandascoreApiKey
		}
	}, function(error, response, body) {
		if (error || response.statusCode !== 200) {
			throw Error('couldn t get videogames list from pandascore');
		}

		var videogames = JSON.parse(body);
		videogames.forEach(function(videogame) {
			if (blacklist.indexOf(videogame.name) == -1) {
				arrVideogames.push({
					category: 'esport',
					id:   videogame.id,
					name: videogame.name,
					slug: videogame.slug
				});
			}
		});
		handle(arrVideogames);
	});

}

function getCurrentChampionshipsForVideogame(blacklist, handle) {
	var arrCompetitions = [];
	request({
		url: 'https://api.pandascore.co/videogames',
		headers: {
			'X-Auth-Token': conf.pandascoreApiKey
		}
	}, function(error, response, body) {
		if (error || response.statusCode !== 200) {
			throw Error('couldn t get current series from pandascore');
		}

		var competitions = JSON.parse(body);
		competitions.forEach(function(competition) {
			if (blacklist.indexOf(competition.id) == -1) {
				arrCompetitions.push({
					category: 'esport',
					championship: competition.league,
					url: competition._links.fixtures.href.replace('http:', 'https:')
				});
			}
		});
		handle(arrCompetitions);
	});

}


function getFixturesAndPushIntoCalendar(category, championship, url) {

	var headers = {
		'X-Auth-Token': conf.footballDataApiKey
	};

	var firstCalendarLoading = true;
	
	var resultHelper = {};
	resultHelper.headers = headers;
	resultHelper.hoursToWaitBeforeGetResult = 4;
	resultHelper.rules = "The oracle will post the name of winning team after 90 minutes play. This includes added injury or stoppage time but doesn't include extra-time, penalty shootouts or golden goal. If the match is rescheduled to another day, no result will be posted.";
    resultHelper.process = function(response, expectedFeedName, handle) {
        if (response.status == "finished") {
          if (response.fixture.winner != null) {
              let fixture = encodeFixture(response.fixture);
                if (fixture.feedName === expectedFeedName){

                  fixture.winner = response.fixture.winner.name;
                  fixture.winnerCode = response.fixture.winner.acronym;
                  
                  handle(null, fixture);
                  
                  } else {
                    handle('The feedname is not the expected one, feedname found: ' + fixture.feedName);	
                  }
              } else {
                handle('No result in response');
              }
            
        } else {
          handle('Fixture is not finished');
        }
    };
	
	calendar.addResultHelper(category, championship, resultHelper);
	
	function encodeFixture(fixture) {
		let homeTeamName = commons.removeAbbreviations(fixture.homeTeamName);
		let awayTeamName = commons.removeAbbreviations(fixture.awayTeamName);
		let feedHomeTeamName = homeTeamName.replace(/\s/g, '').toUpperCase();
		let feedAwayTeamName = awayTeamName.replace(/\s/g, '').toUpperCase();
		let localDay = moment.utc(fixture.date);
		if (fixture._links.competition.href == "http://api.football-data.org/v1/competitions/444"){ //for bresil championship we convert UTC time to local time approximately
			localDay.subtract(4, 'hours');
		}
		return {
			homeTeam: homeTeamName,
			awayTeam: awayTeamName,
			feedHomeTeamName: feedHomeTeamName,
			feedAwayTeamName: feedAwayTeamName,
			feedName: feedHomeTeamName + '_' + feedAwayTeamName + '_' + localDay.format("YYYY-MM-DD"),
			urlResult: fixture._links.self.href.replace('http:', 'https:'),
			date: moment.utc(fixture.date),
			localDay: localDay
		}
	}

	function loadInCalendar() {
		request({
				url: url,
				headers: headers
			}, function(error, response, body) {
				if (error || response.statusCode !== 200) {
					if (firstCalendarLoading) {
						throw Error('couldn t get fixtures from footballDataOrg ' + url);
					} else {
						return notifications.notifyAdmin("I couldn't get " + championship + " calendar today", "");
					}
				}

				try {
					var jsonResult = JSON.parse(body);
					var arrRawFixtures = jsonResult.fixtures;
				} catch (e) {
					if (firstCalendarLoading) {
						throw Error('error parsing football-data response: ' + e.toString() + ", response: " + body);
					} else {
						return notifications.notifyAdmin("I couldn't parse " + championship + " today", "");
					}
				}
				if (arrRawFixtures.length == 0) {
					if (firstCalendarLoading) {
						throw Error('fixtures array empty, couldn t get fixtures from footballDataOrg');
					} else {
						return notifications.notifyAdmin("I couldn't get fixtures from " + championship + " today", "");
					}
				}


				var arrFixtures = arrRawFixtures.map(fixture => {
					return encodeFixture(fixture);
				});
				calendar.setReloadingFlag(championship, true);
				calendar.deleteAllFixturesFromChampionship(championship);
			
				arrFixtures.forEach(function(fixture) {
					if (fixture.date.diff(moment(),'days') > -15 && fixture.date.diff(moment(),'days') < 30){
						calendar.addFixture(category, championship, fixture.feedName, fixture);
					}
				});
				calendar.setReloadingFlag(championship, false);
				firstCalendarLoading = false;
			}

		);
	}

	loadInCalendar();
	setInterval(loadInCalendar, reloadInterval);
}


exports.getAllVideogamesAndPushIntoCalendar = getAllVideogamesAndPushIntoCalendar;
exports.getFixturesAndPushIntoCalendar = getFixturesAndPushIntoCalendar;