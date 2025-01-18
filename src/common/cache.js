import Keyv from 'keyv';
import { ms } from 'itty-time';

export default new Keyv({ ttl: ms('3h') });