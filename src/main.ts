import './style.css';
import { GlyphhookGame } from './game';

const canvas = document.querySelector<HTMLCanvasElement>('#game');
if (!canvas) throw new Error('Missing #game canvas.');

const game = new GlyphhookGame(canvas);
game.start();
