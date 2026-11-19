export const ForbiddenFramePattern = /secret|nameSeed|"seed"|"answer"|"fullPart"|"dependencyPart"|"dependencyHolder"|"puzzle"|"defect"|"size"/i;

/**
 * Source of the function body that attaches the event collectors to a page inside the CLI's run-code sandbox.
 */
export const installCollectorSource = `
  const forbidden = new RegExp(${JSON.stringify(ForbiddenFramePattern.source)}, 'i');
  const sink = page.__e2e || (page.__e2e = {
    view: null,
    viewCount: 0,
    frames: 0,
    frameBytes: 0,
    messageTypes: {},
    forbiddenHits: [],
    console: [],
    pageErrors: [],
    requestFailures: [],
    badResponses: [],
    sockets: [],
    consoleCursor: 0,
    errorCursor: 0,
    failureCursor: 0,
    responseCursor: 0,
    hitCursor: 0,
    tolerateAbortUntil: 0,
    welcome: null,
    welcomes: 0,
    seatToken: null,
  });
  const attach = (target) => {
    target.on('console', (message) => {
      const location = message.location();
      sink.console.push({ at: Date.now(), type: message.type(), text: message.text().slice(0, 600), url: location && location.url ? location.url : '' });
    });
    target.on('pageerror', (error) => {
      sink.pageErrors.push({ at: Date.now(), text: String(error && error.stack ? error.stack : error).slice(0, 800) });
    });
    target.on('requestfailed', (request) => {
      sink.requestFailures.push({ at: Date.now(), url: request.url(), method: request.method(), failure: request.failure() ? request.failure().errorText : '' });
    });
    target.on('response', (response) => {
      if (response.status() >= 400) sink.badResponses.push({ at: Date.now(), url: response.url(), status: response.status() });
    });
    target.on('websocket', (socket) => {
      const record = { url: socket.url(), openedAt: Date.now(), closedAt: null };
      sink.sockets.push(record);
      socket.on('close', () => { record.closedAt = Date.now(); });
      socket.on('socketerror', (error) => { sink.console.push({ at: Date.now(), type: 'socketerror', text: String(error), url: record.url }); });
      socket.on('framereceived', (frame) => {
        const payload = typeof frame.payload === 'string' ? frame.payload : '';
        sink.frames += 1;
        sink.frameBytes += payload.length;
        const hit = payload.match(forbidden);
        if (hit) sink.forbiddenHits.push({ at: Date.now(), word: hit[0], excerpt: payload.slice(Math.max(0, hit.index - 60), hit.index + 80) });
        if (sink.welcomes > 0 && /"token"/.test(payload)) sink.forbiddenHits.push({ at: Date.now(), word: 'token after the first welcome', excerpt: payload.slice(0, 120) });
        if (sink.seatToken && sink.welcomes > 0 && payload.includes(sink.seatToken)) sink.forbiddenHits.push({ at: Date.now(), word: 'the seat token', excerpt: 'a frame carries the string after seat.' });
        let message = null;
        try { message = JSON.parse(payload); } catch (error) { message = null; }
        if (message && typeof message === 'object') {
          sink.messageTypes[message.t] = (sink.messageTypes[message.t] || 0) + 1;
          if (message.t === 'view') {
            sink.view = message.view;
            sink.viewCount += 1;
            sink.viewAt = Date.now();
          }
          if (message.t === 'welcome') { sink.welcome = { playerId: message.playerId }; sink.welcomes += 1; }
          if (message.t === 'error') sink.console.push({ at: Date.now(), type: 'server-error-frame', text: payload.slice(0, 200), url: record.url });
        }
      });
    });
  };
  attach(page);
  page.__e2eAttach = attach;
  return 'installed';
`;
