/*jslint node: true */
"use strict";

exports.port = null;
//exports.myUrl = 'wss://mydomain.com/bb';
exports.bServeAsHub = false;
exports.bLight = false;

exports.storage = 'sqlite';


exports.hub = 'byteball.org/bb';
exports.deviceName = 'sports oracle';
exports.permanent_pairing_secret = '0000';
exports.control_addresses = ['DEVICE ALLOWED TO CHAT'];
exports.payout_address = 'WHERE THE MONEY CAN BE SENT TO';

exports.bIgnoreUnpairRequests = true;
exports.bSingleAddress = true;
exports.THRESHOLD_DISTANCE = 20;
exports.MIN_AVAILABLE_WITNESSINGS = 100;

exports.bRunWitness = false; // also post empty transactions when there are few datafeed transactions

// pandascore token
exports.pandascoreApiKey = 'xqbWrlgy7WSgt_hlankWizZJXasia2nzCr6OGLj1FUAkwv2z_o0';

// football-data.org credentials
exports.footballDataApiKey = '';

// MySportsFeeds credentials
exports.MySportsFeedsUser = 'ILay';
exports.MySportsFeedsPw = 'dN43h&G!%K8j';

exports.KEYS_FILENAME = 'keys.json';

exports.admin_email = i.a.zaharchuk@gmail.com

console.log('finished sports oracle conf');
