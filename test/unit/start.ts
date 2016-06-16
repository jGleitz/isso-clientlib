// Library setup. Sinon does not play well with webpack and is thus
// imported through the runner html.
import * as chai from 'chai';
import * as sinonChai from 'sinon-chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as chaiDateTime from 'chai-datetime';
import * as es6Promise from 'es6-promise';

(<any> es6Promise).polyfill();
chai.use(sinonChai);
chai.use(chaiAsPromised);
chai.use(chaiDateTime);

// Import test files
import './IssoServer.test';
import './CommentList.test';
import './Page.test';
import './Comment.test';
import './Author.test';
