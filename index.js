// Template Alexa Skill
'use strict';

const winston = require('winston');
const request = require('request-promise');

var logger = new(winston.Logger)({
    transports: [
        new(winston.transports.Console)({
            prettyPrint: true,
            timestamp: true,
            json: false,
            stderrLevels: ['error']
        })
    ]
});

var intentHandlers = {};

if (process.env.NODE_DEBUG_EN) {
    logger.level = 'debug';
}

exports.handler = function (event, context) {
    try {
        logger.info('event.session.application.applicationId=' + event.session.application.applicationId);

        if (APP_ID !== '' && event.session.application.applicationId !== APP_ID) {
            context.fail('Invalid Application ID');
        }

        if (!event.session.attributes) {
            event.session.attributes = {};
        }

        logger.debug('Incoming request:\n', JSON.stringify(event, null, 2));

        if (event.session.new) {
            onSessionStarted({
                requestId: event.request.requestId
            }, event.session);
        }

        if (event.request.type === 'LaunchRequest') {
            onLaunch(event.request, event.session, new Response(context, event.session));
            logger.info('lanuch request');
        } else if (event.request.type === 'IntentRequest') {
            var response = new Response(context, event.session);
            if (event.request.intent.name in intentHandlers) {
                intentHandlers[event.request.intent.name](event.request, event.session, response, getSlots(event.request));
                logger.info('handle found');
            } else {
                response.speechText = 'Sorry, I could not understand that one';
                response.shouldEndSession = true;
                response.done();
                console.log('handle not found');
            }
        } else if (event.request.type === 'SessionEndedRequest') {
            onSessionEnded(event.request, event.session);
            context.succeed();
        }
    } catch(e) {
        context.fail('Exception: '  + getError(e));
    }
}

var Response = function(context, session) {
    this.speechText = '';
    this.shouldEndSession = true;
    this.ssml = true;
    this._context = context;
    this._session = session;

    this.done = function (options) {
        if (options && options.speechText) {
            this.speechText = options.speechText;
        }

        if (options && options.repromptText) {
            this.repromptText = options.repromptText;
        }

        if (options && options.ssmlEn) {
            this.ssmlEn = options.ssmlEn;
        }

        if (options && options.shouldEndSession) {
            this.shouldEndSession = options.shouldEndSession;
        }

        this._context.succeed(buildAlexaResponse(this));
    }

    this.fail = function (msg) {
        logger.error(msg);
        this._context.fail(msg);
    }
}

function getSlots(req) {
    var slots = {};
    for (var key in req.intent.slots) {
        if (req.intent.slots[key].value !== undefined) {
            slots[key] = req.intent.slots[key].value;
        }
    }
    return slots;
}

function getError(err) {
    var msg = '';
    if (typeof err === 'object') {
        msg = ' : Message : ' + err.message;
    }
    if (err.stack) {
        msg += '\nStacktrace';
        msg += '\n================\n';
        msg += err.stack;
    } else {
        msg = err;
        msg += '- This error is not object';
    }
    return msg;
}

function creaetSpeachObject(text, ssmlEn) {
    if(ssmlEn) {
        return {
            type: 'SSML',
            ssml: '<speak>' + text + '</speak>'
        }
    } else {
        return {
            type: 'PlainText',
            text: text
        }
    }
}

function buildAlexaResponse(response) {
    var alexaResponse = {
        version: "1.0",
        response: {
            outputSpeech: creaetSpeachObject(response.speechText, response.ssmlEn),
            shouldEndSession: response.shouldEndSession
        }
    };

    if (response.cardTitle) {
        alexaResponse.response.card = {
            type: 'Simple',
            title: response.cardTitle
        };


        if (response.imageUrl) {
            alexaResponse.response.card.type = 'Standard';
            alexaResponse.response.card.text = response.cardContent;
            alexaResponse.response.card.image = {
                smallmageUrl: response.imageUrl,
                largeImageUrl: response.imageUrl
            }
        } else {
            alexaResponse.response.card.cardContent = response.cardContent;
        }
    }

    if (!response.shouldEndSession && response._session && response._session.attributes) {
        alexaResponse.sessionAttributes = response._session.attributes;
    }

    logger.debug('Final Response:\n', JSON.stringify(alexaResponse, null, 2));
    return alexaResponse;
}

// Skill specific logic starts here

var APP_ID = 'YOUR_APPLICATION_ID';

var API_BASE_URL = 'https://api.chucknorris.io/jokes/random';

function onSessionStarted(sessionStartedRequest, session) {
    logger.debug('onSessionStarted requestId=' + sessionStartedRequest.requestId + ', sessionId=' + session.sessionId);
}

function onSessionEnded(sessionEndedRequest, session) {
    logger.debug('onSessionEnded requestId=' + sessionEndedRequest.requestId + ', sessionId=' + session.sessionId);
}

function onLaunch(launchRequest, session, response) {
    logger.debug('onLaunch requestId=' + launchRequest.requestId + ', sessionId=' + session.sessionId);

    response.speechText = 'Hi, I am chuck norris facts skill. You can ask me about chuck norris facts, jokes.';
    response.repromptText = 'This is purely about entertainment nothing personal. For example you can say what if chuck norris a celebrity' + 
    ' or you can say what if chuck norris a sports man or  you can say tell me chuck norris joke';
    response.shouldEndSession = false;
    response.done();
}

intentHandlers['GetFactIntent'] = function(request, session, response, slots) {
    response.cardTitle = 'Chuck norris Fact';
    response.cardContent = '';
    getJoke(null)
        .then(data => {
            response.speechText = data.value;
            response.cardContent = data.value;
            response.shouldEndSession = true;
            response.done();
        });
}

intentHandlers['GetDevFactIntent'] = function(request, session, response, slots) {
    response.cardTitle = 'What if Chuck norris a developer';
    response.cardContent = '';
    getJoke('dev')
        .then(data => {
            response.speechText = data.value;
            response.cardContent = data.value;
            response.shouldEndSession = true;
            response.done();
        });
}

intentHandlers['GetPoliticsFactIntent'] = function(request, session, response, slots) {
    response.cardTitle = 'What if Chuck norris a poltician';
    response.cardContent = '';
    getJoke('political')
        .then(data => {
            response.speechText = data.value;
            response.cardContent = data.value;
            response.shouldEndSession = true;
            response.done();
        });
}

intentHandlers['GetTravellerFactIntent'] = function(request, session, response, slots) {
    response.cardTitle = 'What if Chuck norris a traveller';
    response.cardContent = '';
    getJoke('travel')
        .then(data => {
            response.speechText = data.value;
            response.cardContent = data.value;
            response.shouldEndSession = true;
            response.done();
        });
}

intentHandlers['GetCelebrityFactIntent'] = function(request, session, response, slots) {
    response.cardTitle = 'What if Chuck norris a celebrity';
    response.cardContent = '';
    getJoke('celebrity')
        .then(data => {
            response.speechText = data.value;
            response.cardContent = data.value;
            response.shouldEndSession = true;
            response.done();
        });
}

intentHandlers['GetSportsFactIntent'] = function(request, session, response, slots) {
    response.cardTitle = 'What if Chuck norris a sportsman';
    response.cardContent = '';
    getJoke('sport')
        .then(data => {
            response.speechText = data.value;
            response.cardContent = data.value;
            response.shouldEndSession = true;
            response.done();
        });
}

intentHandlers['AMAZON.StopIntent'] = function (request, session, response, slots) {
    response.speechText = 'Good Bye.';
    response.shouldEndSession = true;
    response.done();
}

intentHandlers['AMAZON.CancelIntent'] = intentHandlers['AMAZON.StopIntent'];

intentHandlers['AMAZON.HelpIntent'] = function(request, session, response, slots) {
    response.speechText = "You can ask what if chuck norris skill about jokes and facts. Please refer to skill description for all possible sample utterences.";
    response.repromptText = "For example you can say what if chuck norris a celebrity" + 
    " or you can say what if chuck norris a sports man or  you can say tell me chuck norris joke";
    response.shouldEndSession = false;
    response.done();
}

function getJoke(category) {
    return request({
        "method":"GET", 
        "uri": category === null ? API_BASE_URL : API_BASE_URL + "?category=" + category,
        "json": true,
        "headers": {}
      });
}
