import BaseStrategy from '../BaseStrategy';
import Recording from '../../../components/Game/Stages/Recording/Recording';
import Listening from '../../../components/Game/Stages/Listening/Listening';
import Ending from '../../../components/Game/Stages/Ending/Ending';
import Waiting from '../../../components/Game/Stages/Waiting/Waiting';

import {PREGAME_DATA, RECORDING, LISTENING, SECOND_LISTENING, RESULT} from '../../Constants/WebsocketTypes';
import {RIGHT} from '../../Constants/Game';
import {SINGER, LISTENER, RECORDNG_MESSAGE, READY_MESSAGE1, READY_MESSAGE2, GOT_RESULT} from '../../Constants/Multiplayer';

export default class MultiPlayerStrategy extends BaseStrategy {
    constructor() {
        super('Multiplayer');

        this._socket.onopen = () => {
            this._socket.onmessage = this.onMessage;
        };

        this.role = null;
        this.secondUser = null;
    }

    onMessage({data: message}) {
        switch (message.type) {
            case PREGAME_DATA:
                return this._initPreGame(message.data);
            case RECORDING:
                return this._initRecordingPage(message.data);
            case LISTENING:
                return this._listening(message.data);
            case SECOND_LISTENING:
                return this._secondListening(message.data);
            case RESULT:
                return this._initEndingPage(message.data);
            default:
                console.log('Unexpected message', message);
                return null;
        }
    }

    _initPreGame(data) {
        this.role = data.role;
        this.secondUser = data.secondUser;
        if (this.role === LISTENER) {
            this._initWaitingPage();
        }
    }

    _initWaitingPage() {
        const waitingPage = new Waiting(RECORDNG_MESSAGE);
        this.stages.push(waitingPage);
        this.next();
    }

    _initRecordingPage(data) {
        const recordingPage = new Recording({musicSource: data});
        recordingPage.getSubmitButton().addEventListener('click', () => {
            recordingPage.hide();
            recordingPage.stopPlayer();

            const musicBlob = recordingPage.getMusicBlob();

            const result = {
                type: RECORDING,
                data: musicBlob
            };

            this.send(result);

            if (this.role === SINGER) {
                this._initWaitingPage();
            }
        });
        this.stages.push(recordingPage);
        this.next();
    }

    _listening(data) {
        if (this.role === SINGER) {
            this.stage.addAudio(data, READY_MESSAGE1);
        } else {
            this._initListeningPage();
        }
    }

    _secondListening(data) {
        this.stage.addAudio(data, READY_MESSAGE2);
    }

    _initListeningPage(data) {
        const listeningPage = new Listening({musicSource: data});
        listeningPage.getSubmitButton().addEventListener('click', () => {
            listeningPage.hide();
            listeningPage.stopPlayer();

            const result = {
                type: LISTENING,
                data: listeningPage.getUserInput()
            };

            this.send(result);
        });
        this.stages.push(listeningPage);
        this.next();
    }

    _initEndingPage(data) {
        const endingPage = new Ending({isWin: data.message === RIGHT, score: data.score});
        endingPage.getBackButton().addEventListener('click', () => {
            this.finish();
        });

        const nextStage = () => {
            this.stages.push(endingPage);
            this.next();
        };

        if (this.role === SINGER) {
            this.stage.ready();
            this.getResultButton.addEventListener('click', nextStage.bind(this));
        } else {
            nextStage();
        }
    }
}