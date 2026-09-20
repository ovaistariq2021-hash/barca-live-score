const Alexa = require('ask-sdk-core');
const fs = require('fs');
const path = require('path');
const { getBarcaStatus } = require('./football');
const { buildScoreboard } = require('./scoreboard');

const scoreboardDocument = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'apl', 'scoreboard.json'), 'utf8')
);

function supportsAPL(handlerInput) {
    const interfaces = Alexa.getSupportedInterfaces(handlerInput.requestEnvelope);
    return !!(interfaces && interfaces['Alexa.Presentation.APL']);
}

function addScoreboardDirective(handlerInput, datasource) {
    if (supportsAPL(handlerInput)) {
        handlerInput.responseBuilder.addDirective({
            type: 'Alexa.Presentation.APL.RenderDocument',
            token: 'barcaScoreboardToken',
            document: scoreboardDocument,
            datasources: datasource
        });
    }
}

async function speakScoreboard(handlerInput) {
    const status = await getBarcaStatus();
    const { speech, datasource } = buildScoreboard(status);
    addScoreboardDirective(handlerInput, datasource);
    return { speech, keepOpen: status.type === 'live' };
}

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    async handle(handlerInput) {
        try {
            const { speech, keepOpen } = await speakScoreboard(handlerInput);
            const responseBuilder = handlerInput.responseBuilder.speak(speech);
            if (keepOpen) {
                responseBuilder.reprompt("Say 'what's the score' anytime to check again.");
            } else {
                responseBuilder.withShouldEndSession(true);
            }
            return responseBuilder.getResponse();
        } catch (err) {
            console.log(`~~~~ Launch error: ${err.stack}`);
            return handlerInput.responseBuilder
                .speak("I couldn't reach the football data service right now. Please try again shortly.")
                .withShouldEndSession(true)
                .getResponse();
        }
    }
};

const GetLiveScoreIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'GetLiveScoreIntent';
    },
    async handle(handlerInput) {
        try {
            const { speech, keepOpen } = await speakScoreboard(handlerInput);
            const responseBuilder = handlerInput.responseBuilder.speak(speech);
            if (keepOpen) {
                responseBuilder.reprompt("Say 'what's the score' anytime to check again.");
            } else {
                responseBuilder.withShouldEndSession(true);
            }
            return responseBuilder.getResponse();
        } catch (err) {
            console.log(`~~~~ GetLiveScore error: ${err.stack}`);
            return handlerInput.responseBuilder
                .speak("I couldn't reach the football data service right now. Please try again shortly.")
                .withShouldEndSession(true)
                .getResponse();
        }
    }
};

const NextMatchIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'NextMatchIntent';
    },
    async handle(handlerInput) {
        try {
            const { speech } = await speakScoreboard(handlerInput);
            return handlerInput.responseBuilder
                .speak(speech)
                .withShouldEndSession(true)
                .getResponse();
        } catch (err) {
            console.log(`~~~~ NextMatch error: ${err.stack}`);
            return handlerInput.responseBuilder
                .speak("I couldn't reach the football data service right now. Please try again shortly.")
                .withShouldEndSession(true)
                .getResponse();
        }
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = "Ask me for Barca's live score, or ask when Barca plays next.";
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder
            .speak('Visca Barca!')
            .withShouldEndSession(true)
            .getResponse();
    }
};

const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = "Sorry, I don't know about that. Ask me for Barca's live score.";
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        return handlerInput.responseBuilder.getResponse();
    }
};

const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);
        const speakOutput = 'Sorry, I had trouble doing what you asked. Please try again.';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const skillBuilder = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        GetLiveScoreIntentHandler,
        NextMatchIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler,
    )
    .addErrorHandlers(
        ErrorHandler,
    );

exports.skillBuilder = skillBuilder;
exports.handler = skillBuilder.lambda();
