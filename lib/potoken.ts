import { Innertube, UniversalCache } from "youtubei.js";
import { BG } from "bgutils-js";
import { JSDOM } from "jsdom";

export interface PoTokenResult {
  visitorData: string;
  poToken: string;
}

const REQUEST_KEY = "O43z0dpjhgX20SCx4KAo";

let cached: { result: PoTokenResult; expiresAt: number } | null = null;

function setupBrowserGlobals() {
  const dom = new JSDOM();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = globalThis as any;
  g.window = dom.window;
  g.document = dom.window.document;
  return dom.window as unknown as Record<string, unknown>;
}

export async function getPoToken(): Promise<PoTokenResult> {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const innertube = await Innertube.create({ cache: new UniversalCache(false) });
  const visitorData = innertube.session.context.client.visitorData ?? "";

  const globalObj = setupBrowserGlobals();

  const bgConfig = {
    fetch: fetch.bind(globalThis),
    globalObj,
    identifier: visitorData,
    requestKey: REQUEST_KEY,
  };

  const challenge = await BG.Challenge.create(bgConfig);
  if (!challenge) throw new Error("BotGuard challenge를 가져오지 못했습니다.");

  const interpreterJavascript =
    challenge.interpreterJavascript.privateDoNotAccessOrElseSafeScriptWrappedValue;

  if (interpreterJavascript) {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    new Function(interpreterJavascript)();
  } else {
    throw new Error("BotGuard VM 스크립트를 불러오지 못했습니다.");
  }

  const poTokenResult = await BG.PoToken.generate({
    program: challenge.program,
    globalName: challenge.globalName,
    bgConfig,
  });

  const result: PoTokenResult = {
    visitorData,
    poToken: poTokenResult.poToken,
  };
  cached = { result, expiresAt: Date.now() + 1000 * 60 * 60 * 6 };
  return result;
}
