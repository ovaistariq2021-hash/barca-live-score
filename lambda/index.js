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
    const start = Date.now();
    console.log('Fetching Barca status...');
    const status = await getBarcaStatus();
    console.log(`getBarcaStatus took ${Date.now() - start}ms, type=${status.type}`);
    const { speech, datasource } = buildScoreboard(status);
    handlerInput.attributesManager.setSessionAttributes({ lastDatasource: datasource });
    addScoreboardDirective(handlerInput, datasource);
    return { speech };
}

const VOICE_ERROR = "I couldn't reach the football data service right now. Please try again shortly.";

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    async handle(handlerInput) {
        try {
            const { speech } = await speakScoreboard(handlerInput);
            return handlerInput.responseBuilder
                .speak(speech)
                .withShouldEndSession(false)
                .getResponse();
        } catch (err) {
            console.log(`~~~~ Launch error: ${err.stack}`);
            return handlerInput.responseBuilder
                .speak(VOICE_ERROR)
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
            const { speech } = await speakScoreboard(handlerInput);
            return handlerInput.responseBuilder
                .speak(speech)
                .withShouldEndSession(false)
                .getResponse();
        } catch (err) {
            console.log(`~~~~ GetLiveScore error: ${err.stack}`);
            return handlerInput.responseBuilder
                .speak(VOICE_ERROR)
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
                .withShouldEndSession(false)
                .getResponse();
        } catch (err) {
            console.log(`~~~~ NextMatch error: ${err.stack}`);
            return handlerInput.responseBuilder
                .speak(VOICE_ERROR)
                .withShouldEndSession(true)
                .getResponse();
        }
    }
};

const ScoreboardRefreshEventHandler = {
    canHandle(handlerInput) {
        const requestType = Alexa.getRequestType(handlerInput.requestEnvelope);
        if (requestType !== 'Alexa.Presentation.APL.UserEvent') return false;
        const args = handlerInput.requestEnvelope.request.arguments || [];
        return args[0] === 'refresh';
    },
    async handle(handlerInput) {
        const attributesManager = handlerInput.attributesManager;
        try {
            console.log('Auto-refresh tick...');
            const status = await getBarcaStatus();
            const { datasource } = buildScoreboard(status);
            attributesManager.setSessionAttributes({ lastDatasource: datasource });
            addScoreboardDirective(handlerInput, datasource);
        } catch (err) {
            console.log(`~~~~ Refresh error: ${err.stack}`);
            // Keep showing the last known-good screen and retry sooner, instead of blanking the display.
            const cached = attributesManager.getSessionAttributes().lastDatasource;
            const fallback = cached || buildScoreboard({ type: 'none', match: null }).datasource;
            fallback.nextPollMs = 30 * 1000;
            addScoreboardDirective(handlerInput, fallback);
        }
        return handlerInput.responseBuilder
            .withShouldEndSession(false)
            .getResponse();
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
        if (supportsAPL(handlerInput)) {
            handlerInput.responseBuilder.addDirective({ type: 'Alexa.Presentation.APL.ClearDocument' });
        }
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
        ScoreboardRefreshEventHandler,
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
