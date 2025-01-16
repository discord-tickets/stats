import Keyv from 'keyv';
import { seconds } from 'itty-time';

export default new Keyv({ ttl: seconds('3h') });