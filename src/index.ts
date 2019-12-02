import { getSetTimeoutFn } from "./helpers";

const defaults = {
  timeout: 4500,
  interval: 50
};

/**
 * Waits for the expectation to pass and returns a Promise
 *
 * @param  expectation  Function  Expectation that has to complete without throwing
 * @param  timeout  Number  Maximum wait interval, 4500ms by default
 * @param  interval  Number  Wait-between-retries interval, 50ms by default
 * @return  Promise  Promise to return a callback result
 */
const waitForExpect = function waitForExpect(
  expectation: () => void,
  timeout = defaults.timeout,
  interval = defaults.interval
) {
  const setTimeout = getSetTimeoutFn();

  // eslint-disable-next-line no-param-reassign
  if (interval < 1) interval = 1;
  let tries = 0;

  const isDateMocked = (Date as any)._isMockFunction || (Date.now as any)._isMockFunction;
  const maxTries = Math.ceil(timeout / interval);
  const startTime = isDateMocked ? 0 : Date.now()
  return new Promise((resolve, reject) => {
    const rejectOrRerun = (error: Error) => {
      if (isDateMocked) {
        // We can't use the fancy way to predict the execution time when Date or Date.now is mocked.
        // So fallback to traditional route
        if (tries > maxTries) {
          reject(error);
          return;
        }
      } else {
          // so far:
          //  the total execution duration = Date.now() - startTime
          //  execution times = tries
          //  wait for interval times = tries - 1
          // so avg time runExpectation takes = ((Date.now() - startTime) - interval * (tries - 1)) / tries
          // expected next execution time = avg runExpectation time + interval = below
          const expectedNextExecutionTime = (Date.now() - startTime + interval) / tries
          if (expectedNextExecutionTime > (timeout - Date.now() + startTime)) {
            reject(error);
            return;
          }
      }
      // eslint-disable-next-line no-use-before-define
      setTimeout(runExpectation, interval);
    };
    function runExpectation() {
      tries += 1;
      try {
        Promise.resolve(expectation())
          .then(() => resolve())
          .catch(rejectOrRerun);
      } catch (error) {
        rejectOrRerun(error);
      }
    }
    setTimeout(runExpectation, 0);
  });
};

waitForExpect.defaults = defaults;

export default waitForExpect;
