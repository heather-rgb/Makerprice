import { useEffect, useMemo, useRef, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInAnonymously,
  signInWithPopup,
  linkWithPopup,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  signOut,
  signInWithCredential,
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { hubAuth, hubFunctions } from "../firebaseHub";

type AdviceBlock =
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] };

type AdviceSection = {
  title: string;
  blocks: AdviceBlock[];
};




function parseAdviceToSections(input: string): AdviceSection[] {
  const text = String(input || "").replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  const lines = text.split("\n");

  const sections: AdviceSection[] = [];
  let current: AdviceSection = { title: "Advice", blocks: [] };

  const flush = () => {
    // remove empty paragraphs/lists
    current.blocks = current.blocks.filter((b) => {
      if (b.kind === "p") return b.text.trim().length > 0;
      if (b.kind === "ul") return b.items.length > 0;
      if (b.kind === "ol") return b.items.length > 0;
      return true;
    });

    if (current.blocks.length > 0 || current.title !== "Advice") sections.push(current);
  };


  let ul: string[] = [];
  let ol: string[] = [];


  const flushLists = () => {
    if (ul.length) {
      current.blocks.push({ kind: "ul", items: ul });
      ul = [];
    }
    if (ol.length) {
      current.blocks.push({ kind: "ol", items: ol });
      ol = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();


    // Headings like: ## Summary (legacy support)
    const headingMatch = line.trim().match(/^#{1,6}\s+(.*)$/);
    if (headingMatch) {
      flushLists();
      flush();
      current = { title: headingMatch[1].trim(), blocks: [] };
      continue;
    }

    // Plain headings like: Summary / What Looks Good / One Next Step (no markdown)
    const trimmedForHeading = line.trim();

    const plainHeadingMatch = trimmedForHeading.match(
      /^(Summary|What Looks Good|What To Adjust \(Most Important First\)|What To Adjust|One Next Step|Where You Are Now|Highest Leverage Steps|Risks Or Gaps|Suggested Price Guidance|Best Fit Direction|Why It Fits|A Simple First Plan)\s*:?\s*$/i
    );

    if (plainHeadingMatch) {
      flushLists();
      flush();
      current = { title: plainHeadingMatch[1].trim(), blocks: [] };
      continue;
    }


    const trimmed = line.trim();

    // Blank line = end any running list
    if (!trimmed) {
      flushLists();
      continue;
    }

    // Unordered list like: - item
    const ulMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      // if we were building an ordered list, close it
      if (ol.length) flushLists();
      ul.push(ulMatch[1].trim());
      continue;
    }

    // Ordered list like: 1. item
    const olMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (olMatch) {
      // if we were building an unordered list, close it
      if (ul.length) flushLists();
      ol.push(olMatch[1].trim());
      continue;
    }

    // Normal paragraph line
    flushLists();
    current.blocks.push({ kind: "p", text: trimmed });
  }

  flushLists();
  flush();

  return sections.length ? sections : [{ title: "Advice", blocks: [{ kind: "p", text }] }];
}


type Props = {
  results: any;
  state: any;
  currencySymbol: string;
};

type AdviceResponse =
  | {
    status: "ok";
    adviceMarkdown?: string;
    freeUsed?: number;
    paidRemaining?: number;
    entitled?: boolean;
  }
  | {
    status: "upgrade_required";
    freeUsed?: number;
    paidRemaining?: number;
    entitled?: boolean;
    message?: string;
  }
  | any;

const APP_ID = "makerprice";
const UPGRADE_URL = "https://ixiacreativestudio.com/checkout/?add-to-cart=1779";
const LS_EMAIL_KEY = "ixia_emailForSignIn";
const SS_OOB_KEY_PREFIX = "ixia_emailOob_used_";
// Comparison snapshot storage (MakerPrice)
const LS_PREV_SNAPSHOT_KEY = "ixia_makerprice_prev_snapshot_v1";


function getOobCodeFromUrl(href: string): string | null {
  try {
    const url = new URL(href);
    return url.searchParams.get("oobCode");
  } catch {
    return null;
  }
}
// ---------------- COMPARISON HELPERS ----------------

// IMPORTANT: Do not guess fields. We'll store the full state/results,
// and compute rateDelta from the one confirmed results field.
type PrevSnapshot = {
  state: any;
  results: any;
  savedAtMs: number;
};

function safeReadPrevSnapshot(): PrevSnapshot | null {
  try {
    const raw = window.localStorage.getItem(LS_PREV_SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PrevSnapshot;
  } catch {
    return null;
  }
}

function safeWritePrevSnapshot(snapshot: PrevSnapshot) {
  try {
    window.localStorage.setItem(LS_PREV_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // ignore
  }
}

function safeClearPrevSnapshot() {
  try {
    window.localStorage.removeItem(LS_PREV_SNAPSHOT_KEY);
  } catch {
    // ignore
  }
}

/**
 * Replace "effectiveHourlyRate" below ONLY if your MakerPrice results uses a different key.
 * Do not guess—confirm via your types/results calculation.
 */
function getEffectiveHourlyRate(results: any): number | null {
  const n = Number(results?.effectiveHourlyRate);
  return Number.isFinite(n) ? n : null;
}

function buildRateDelta(previous: PrevSnapshot, currentResults: any): number | null {
  const prevRate = getEffectiveHourlyRate(previous?.results);
  const curRate = getEffectiveHourlyRate(currentResults);
  if (prevRate == null || curRate == null) return null;
  const d = curRate - prevRate;
  // ignore microscopic float noise
  return Math.abs(d) >= 0.01 ? d : 0;
}
function diffState(prev: any, cur: any) {
  const changes: Array<{ key: string; from: any; to: any }> = [];

  const prevObj = prev && typeof prev === "object" ? prev : {};
  const curObj = cur && typeof cur === "object" ? cur : {};

  const keys = new Set([...Object.keys(prevObj), ...Object.keys(curObj)]);

  for (const key of keys) {
    const a = (prevObj as any)[key];
    const b = (curObj as any)[key];

    // Skip functions/undefined
    if (typeof a === "function" || typeof b === "function") continue;
    if (typeof a === "undefined" && typeof b === "undefined") continue;

    // Simple compare (works well for numbers/strings/booleans)
    const same =
      (Number.isFinite(a) && Number.isFinite(b) && Number(a) === Number(b)) ||
      a === b;

    if (!same) changes.push({ key, from: a, to: b });
  }

  return changes;
}

function buildChangeSummaryLine(changes: Array<{ key: string; from: any; to: any }>) {
  if (!changes.length) return null;

  // Keep it short: show up to 3 changes
  const top = changes.slice(0, 3).map((c) => `${c.key}: ${c.from} → ${c.to}`);
  return `Changes since last run: ${top.join(", ")}.`;
}



export default function AdvicePanel({ results, state, currencySymbol }: Props) {

  const [loading, setLoading] = useState(false);

  const [mode, setMode] = useState<
    | "idle"
    | "ok"
    | "upgrade_required"
    | "claiming"
    | "claimed"
    | "email_link_needs_email"
    | "error"
  >("idle");

  const [errorMsg, setErrorMsg] = useState<string>("");
  const [infoMsg, setInfoMsg] = useState<string>("");

  // Email-link notice shown UNDER the “Email me a sign-in link” button
  const [emailLinkNotice, setEmailLinkNotice] = useState<string>("");

  const [emailForLink, setEmailForLink] = useState<string>("");
  const [emailToFinishLink, setEmailToFinishLink] = useState<string>("");

  const [outJson, setOutJson] = useState<string>("");
  const [adviceMarkdown, setAdviceMarkdown] = useState<string>("");

  const [user, setUser] = useState(hubAuth.currentUser);

  const [entitled, setEntitled] = useState<boolean>(false);
  const [freeUsed, setFreeUsed] = useState<number>(0);
  const [paidRemaining, setPaidRemaining] = useState<number>(0);

  const autoClaimAttemptedForUid = useRef<string | null>(null);
  const [isAdviceCollapsed, setIsAdviceCollapsed] = useState(false);

  // Clean gate: sign-in options hidden until user opens them
  const [showSignInPanel, setShowSignInPanel] = useState(false);

  // Upgrade modal (shown when free uses are exhausted and user is not entitled)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  // Comparison snapshot (previous run)
  const [prevSnapshot, setPrevSnapshot] = useState<PrevSnapshot | null>(null);



  const isEmailCapable = !!user?.email;
  const isAnonymous = !!user?.isAnonymous;

  const payload = useMemo(
    () => ({
      app: APP_ID,
      state,
      results,
      currency: currencySymbol,
      context: "MakerPrice AI advice",
    }),
    [results, state, currencySymbol]
  );


  // Load previous snapshot (for comparison) on first mount
  useEffect(() => {
    const snap = safeReadPrevSnapshot();
    if (snap) setPrevSnapshot(snap);
  }, []);

  useEffect(() => {
    let didAnon = false;
    let firstAuthEvent = true;

    const unsub = onAuthStateChanged(hubAuth, async (u) => {
      setUser(u);

      // After we have ANY user, pull counters immediately so UI doesn't show 0/3.
      // (this must be your existing non-consuming status refresh)
      if (u) {
        refreshUsage(); // <- your existing function that does NOT consume a use
        return;
      }

      // If null on first event, wait briefly before creating anon.
      // This prevents overriding a restored Google session.
      if (firstAuthEvent && !didAnon) {
        firstAuthEvent = false;
        setTimeout(async () => {
          if (!hubAuth.currentUser && !didAnon) {
            didAnon = true;
            await signInAnonymously(hubAuth);
            // refresh after anon exists
            refreshUsage();
          }
        }, 400);
        return;
      }

      firstAuthEvent = false;
    });

    return () => unsub();
  }, []);


  // Email link sign-in handler (guard against double consumption)
  useEffect(() => {
    (async () => {
      try {
        const href = window.location.href;
        if (!isSignInWithEmailLink(hubAuth, href)) return;

        const oob = getOobCodeFromUrl(href);
        if (oob) {
          const key = `${SS_OOB_KEY_PREFIX}${oob}`;
          if (window.sessionStorage.getItem(key)) return;
          window.sessionStorage.setItem(key, "1");
        }

        const savedEmail = window.localStorage.getItem(LS_EMAIL_KEY);

        if (!savedEmail) {
          setMode("email_link_needs_email");
          return;
        }

        setLoading(true);
        setErrorMsg("");
        setInfoMsg("");
        setEmailLinkNotice("");
        setOutJson("");

        await signInWithEmailLink(hubAuth, savedEmail, href);

        window.localStorage.removeItem(LS_EMAIL_KEY);
        window.history.replaceState({}, document.title, window.location.pathname);

        setMode("claiming");
        setInfoMsg("Signed in. If you already purchased, unlock below.");
      } catch (e: any) {
        console.error(e);

        if (e?.code === "auth/invalid-action-code") {
          window.localStorage.removeItem(LS_EMAIL_KEY);
          setMode("error");
          setErrorMsg(
            "That sign-in link is no longer valid. Please request a new sign-in link and try again."
          );
          return;
        }

        setMode("error");
        setErrorMsg(e?.message ?? "Email link sign-in failed.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function finishEmailLinkSignInManually() {
    setLoading(true);
    setErrorMsg("");
    setInfoMsg("");
    setEmailLinkNotice("");
    setOutJson("");

    try {
      const href = window.location.href;
      if (!isSignInWithEmailLink(hubAuth, href)) {
        setMode("error");
        setErrorMsg("This page does not contain a valid sign-in link.");
        return;
      }

      const oob = getOobCodeFromUrl(href);
      if (oob) {
        const key = `${SS_OOB_KEY_PREFIX}${oob}`;
        if (window.sessionStorage.getItem(key)) {
          setMode("error");
          setErrorMsg(
            "This sign-in link has already been used. Please request a new sign-in link."
          );
          return;
        }
        window.sessionStorage.setItem(key, "1");
      }

      const email = emailToFinishLink.trim().toLowerCase();
      if (!email) {
        setMode("error");
        setErrorMsg("Please enter the email address you used.");
        return;
      }

      await signInWithEmailLink(hubAuth, email, href);

      window.localStorage.removeItem(LS_EMAIL_KEY);
      window.history.replaceState({}, document.title, window.location.pathname);

      setMode("claiming");
      setInfoMsg("Signed in. If you already purchased, unlock below.");
    } catch (e: any) {
      console.error(e);

      if (e?.code === "auth/invalid-action-code") {
        window.localStorage.removeItem(LS_EMAIL_KEY);
        setMode("error");
        setErrorMsg(
          "That sign-in link is no longer valid. Please request a new sign-in link and try again."
        );
        return;
      }

      setMode("error");
      setErrorMsg(e?.message ?? "Could not complete sign-in from email link.");
    } finally {
      setLoading(false);
    }
  }

  async function runAdvice() {
    setLoading(true);
    setErrorMsg("");
    setInfoMsg("");
    setEmailLinkNotice("");
    setOutJson("");
    setAdviceMarkdown("");

    // If user has no free uses left and is not entitled,
    // do NOT call OpenAI — show upgrade modal instead
    if (!entitled && freeUsed >= 3) {
      setMode("upgrade_required");
      setShowUpgradeModal(true);
      setLoading(false);
      return;
    }


    try {
      if (!hubAuth.currentUser) {
        await signInAnonymously(hubAuth);
      }


      const fn = httpsCallable(hubFunctions, "generateAdvice");

      // Build request payload, optionally including comparison fields
      let requestPayload: any = { ...payload };

      if (prevSnapshot) {
        const rateDelta = buildRateDelta(prevSnapshot, results);

        // Only include comparison fields if rateDelta is a real number AND not zero
        if (typeof rateDelta === "number" && rateDelta !== 0) {
          requestPayload = {
            ...payload,
            previous: prevSnapshot,
            rateDelta,
          };
        }
      }

      // Safety: never send null/undefined comparison fields
      if (!requestPayload.previous) delete requestPayload.previous;
      if (requestPayload.rateDelta == null) delete requestPayload.rateDelta;

      // Build current snapshot
      const currentSnap: PrevSnapshot = {
        state,
        results,
        savedAtMs: Date.now(),
      };

      if (prevSnapshot) {
        const rateDelta = buildRateDelta(prevSnapshot, results);

        const changes = diffState(prevSnapshot.state, state);
        const changeSummary = buildChangeSummaryLine(changes);

        const hasMeaningfulChange =
          (typeof rateDelta === "number" && rateDelta !== 0) || !!changeSummary;

        if (hasMeaningfulChange) {
          requestPayload = {
            ...payload,
            previous: prevSnapshot,
            ...(typeof rateDelta === "number" && rateDelta !== 0 ? { rateDelta } : {}),
            ...(changeSummary ? { changeSummary } : {}),
          };
        }
      }

      // Safety cleanup
      if (!requestPayload.previous) delete requestPayload.previous;
      if (requestPayload.rateDelta == null) delete requestPayload.rateDelta;
      if (!requestPayload.changeSummary) delete requestPayload.changeSummary;

      const res: any = await fn({ appId: APP_ID, payload: requestPayload });


      const data: AdviceResponse = res.data ?? {};

      setOutJson(JSON.stringify(data, null, 2));

      if (typeof data.entitled === "boolean") setEntitled(data.entitled);
      if (typeof data.freeUsed === "number") setFreeUsed(data.freeUsed);
      if (typeof data.paidRemaining === "number") setPaidRemaining(data.paidRemaining);

      if (data.status === "ok") {
        setAdviceMarkdown(data.adviceMarkdown ?? "");
        setIsAdviceCollapsed(false); // auto-show new advice
        setMode("ok");

        // Save snapshot so the next run can compare
        const snap: PrevSnapshot = { state, results, savedAtMs: Date.now() };
        setPrevSnapshot(snap);
        safeWritePrevSnapshot(snap);

        return;
      }


      if (data.status === "upgrade_required") {
        setMode("upgrade_required");
        setShowUpgradeModal(true);
        setLoading(false);
        return;
      }


      setMode("error");
      setErrorMsg("Unexpected response from generateAdvice.");
    } catch (e: any) {
      console.error(e);
      setMode("error");
      setErrorMsg(e?.message ?? "Error calling generateAdvice.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshUsage() {
    try {
      const fn = httpsCallable(hubFunctions, "generateAdvice");
      const res: any = await fn({
        appId: APP_ID,
        payload: null,
        dryRun: true,
      });

      const data = res.data ?? {};
      if (typeof data.entitled === "boolean") setEntitled(data.entitled);
      if (typeof data.freeUsed === "number") setFreeUsed(data.freeUsed);
      if (typeof data.paidRemaining === "number") setPaidRemaining(data.paidRemaining);

      // Optional: keep mode consistent with counters without triggering advice
      if (data.status === "upgrade_required") setMode("upgrade_required");
      if (data.status === "ok") setMode("idle");
    } catch {
      // silent by design
    }
  }


  function openUpgrade() {
    window.open(UPGRADE_URL, "_blank", "noopener,noreferrer");
  }

  async function signInGoogle() {
    setLoading(true);
    setErrorMsg("");
    setInfoMsg("");
    setEmailLinkNotice("");

    try {
      const provider = new GoogleAuthProvider();

      // ✅ Fix double popup:
      // If linking fails because the credential is already used (existing Firebase user),
      // use the credential returned by the error to sign in directly (no second popup).
      if (hubAuth.currentUser?.isAnonymous) {
        try {
          await linkWithPopup(hubAuth.currentUser, provider);
        } catch (e: any) {
          if (
            e?.code === "auth/credential-already-in-use" ||
            e?.code === "auth/email-already-in-use"
          ) {
            const cred = GoogleAuthProvider.credentialFromError(e);
            if (cred) {
              await signInWithCredential(hubAuth, cred);
            } else {
              // fallback only if we truly have no credential (rare)
              await signInWithPopup(hubAuth, provider);
            }
          } else {
            throw e;
          }
        }
      } else {
        await signInWithPopup(hubAuth, provider);
      }

      setMode("claiming");
      setInfoMsg("Signed in. If you already purchased, unlock below.");
    } catch (e: any) {
      console.error(e);
      setMode("error");
      setErrorMsg(e?.message ?? "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  async function sendEmailLink() {
    setLoading(true);
    setErrorMsg("");
    setInfoMsg("");
    setOutJson("");
    setEmailLinkNotice("");

    try {
      const email = emailForLink.trim().toLowerCase();
      if (!email) {
        setMode("error");
        setErrorMsg("Please enter your email address first.");
        return;
      }

      const redirectUrl = `${window.location.origin}${window.location.pathname}`;
      const actionCodeSettings = { url: redirectUrl, handleCodeInApp: true };

      await sendSignInLinkToEmail(hubAuth, email, actionCodeSettings);
      window.localStorage.setItem(LS_EMAIL_KEY, email);

      setEmailLinkNotice(
        "Sign-in link sent. Please check your email and open the link to return here."
      );

      setOutJson(JSON.stringify({ status: "email_link_sent", redirectUrl }, null, 2));
    } catch (e: any) {
      console.error(e);
      setMode("error");
      setErrorMsg(e?.message ?? "Failed to send email link.");
    } finally {
      setLoading(false);
    }
  }

  async function claimPurchase(options?: { silent?: boolean }) {
    const silent = !!options?.silent;

    if (!silent) {
      setLoading(true);
      setErrorMsg("");
      setInfoMsg("");
      setEmailLinkNotice("");
      setOutJson("");
    }

    try {
      if (!hubAuth.currentUser || !hubAuth.currentUser.email) {
        if (!silent) {
          setMode("error");
          setErrorMsg("Sign in first so we can match your purchase email.");
        }
        return;
      }

      const fn = httpsCallable(hubFunctions, "claimEntitlements");
      const res: any = await fn({});
      const data = res.data ?? {};

      if (!silent) setOutJson(JSON.stringify(data, null, 2));

      if (data.status === "claimed" || data.status === "already_claimed") {
        setMode("claimed");
        setEntitled(true);
        setInfoMsg("Advice Pack unlocked. Click Get advice when you’re ready.");
        return;
      }

      if (data.status === "no_pending_claim") {
        if (!silent) {
          setMode("error");
          setErrorMsg(
            "No purchase was found for this email yet. If you just purchased, wait a minute and try again."
          );
        } else {
          setMode("upgrade_required");
        }
        return;
      }

      if (!silent) {
        setMode("error");
        setErrorMsg("Unexpected response from claimEntitlements.");
      } else {
        setMode("upgrade_required");
      }
    } catch (e: any) {
      console.error(e);
      if (!silent) {
        setMode("error");
        setErrorMsg(e?.message ?? "Unlock failed.");
      } else {
        setMode("upgrade_required");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  // Auto-claim after email-capable sign-in — but do NOT auto-run advice.
  useEffect(() => {
    (async () => {
      try {
        if (!user || user.isAnonymous || !user.email) return;

        if (autoClaimAttemptedForUid.current === user.uid) return;
        autoClaimAttemptedForUid.current = user.uid;

        setMode("claiming");
        await claimPurchase({ silent: true });
      } catch {
        // silent
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, user?.email, user?.isAnonymous]);

  async function resetSession() {
    setLoading(true);
    setErrorMsg("");
    setInfoMsg("");
    setEmailLinkNotice("");
    setOutJson("");
    setAdviceMarkdown("");
    setMode("idle");
    // Clear comparison snapshot for a true reset
    setPrevSnapshot(null);
    safeClearPrevSnapshot();


    try {
      if (hubAuth.currentUser) {
        await signOut(hubAuth);
      }
      await signInAnonymously(hubAuth);
      autoClaimAttemptedForUid.current = null;

      setEntitled(false);
      setFreeUsed(0);
      setPaidRemaining(0);
      setShowSignInPanel(false);
      setEmailForLink("");
      setEmailToFinishLink("");
    } catch (e) {
      console.warn("Reset session failed:", e);
    } finally {
      setLoading(false);
    }
  }

  const authLine = useMemo(() => {
    if (!user) return "Not signed in";
    if (isAnonymous) return "Free mode (anonymous)";
    return `Signed in • ${user.email ?? "email unavailable"}`;
  }, [user, isAnonymous]);

  // ✅ Fix duplicate “Advice Pack unlocked”:
  // Only show the “free uses” line in free mode. Once entitled, the info message is enough.
  const entitlementLine = useMemo(() => {
    if (entitled) return "";
    return `Free uses in this tool: ${freeUsed} / 3`;
  }, [entitled, freeUsed]);

  const showUpgradeGate = mode === "upgrade_required" && !entitled;

  function renderAdviceBlocks(text: string) {
    const blocks = text
      .split(/\n\s*\n/g)            // split on blank lines
      .map((b) => b.trim())
      .filter(Boolean);

    return blocks.map((block, i) => {
      // detect a simple numbered list block: "1. ..." lines
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      const isNumberedList = lines.length > 1 && lines.every((l) => /^\d+\.\s+/.test(l));

      if (isNumberedList) {
        return (
          <ol key={i} className="ixia-advice-list list-decimal">
            {lines.map((l, idx) => (
              <li key={idx} className="ixia-advice-li">
                {l.replace(/^\d+\.\s+/, "")}
              </li>
            ))}
          </ol>
        );
      }

      return (
        <p key={i} className="ixia-advice-p">
          {block}
        </p>
      );
    });
  }


  return (
    <section className="ixia-card ixia-card--padded space-y-3">

      <div className="space-y-1">
        <h3 className="ixia-card-title">Like some advice on based on your input? You have access to 3 free clicks of our adviser.</h3>

        <p className="ixia-help text-xs">
          Click <strong>Get Advice</strong> for analysis of what looks good and what you could tweak to improve your profit for your product
        </p>

        <div className="ixia-advice-helper">
          <p className="text-xs">{authLine}</p>

          {/* State B: Signed-in + entitled message (no free-use line) */}
          {entitled && !isAnonymous && (
            <p className="text-xs ixia-entitled-line">
              Advice Pack unlocked{paidRemaining > 0 ? ` • Advice remaining: ${paidRemaining}` : ""}.
            </p>
          )}
        </div>



        {/* Free-mode counter only */}
        {!entitled && (
          <>
            {!!entitlementLine && <p className="ixia-help text-xs">{entitlementLine}</p>}

            {hubAuth.currentUser?.isAnonymous && (
              <button
                type="button"
                className="ixia-link ixia-link--signin"
                onClick={() => setShowSignInPanel((v) => !v)}
                disabled={loading}
              >
                {showSignInPanel ? "Hide sign-in" : "Already purchased? Sign in"}
              </button>
            )}
          </>
        )}
      </div>

      {!!infoMsg && !entitled && (
        <div className="ixia-card">
          <p className="ixia-help ixia-info">{infoMsg}</p>
        </div>
      )}



      {!!errorMsg && (
        <div className="ixia-card">
          <p className="ixia-help ixia-error">{errorMsg}</p>
        </div>
      )}

      <button
        type="button"
        className="ixia-button ixia-button--primary ixia-button--full ixia-button--advice"
        onClick={runAdvice}
        disabled={loading}
      >
        {loading ? "Generating…" : "Get advice"}
      </button>
      {hubAuth.currentUser?.isAnonymous && showSignInPanel && !showUpgradeGate && (
        <div className="ixia-card space-y-2">
          <p className="ixia-help ixia-gate-sub">
            Sign in with the same email you used at checkout, then unlock your purchase.
          </p>

          <button
            type="button"
            className="ixia-button ixia-button--secondary ixia-button--full"
            onClick={signInGoogle}
            disabled={loading}
          >
            Sign in with Google
          </button>

          <div className="space-y-2">
            <input
              className="ixia-input"
              type="email"
              placeholder="Email for sign-in link (passwordless)"
              value={emailForLink}
              onChange={(e) => setEmailForLink(e.target.value)}
            />
            <button
              type="button"
              className="ixia-button ixia-button--secondary ixia-button--full"
              onClick={sendEmailLink}
              disabled={loading}
            >
              Email me a sign-in link
            </button>

            {!!emailLinkNotice && (
              <p className="ixia-help ixia-notice ixia-notice--emailLinkSent">
                {emailLinkNotice}
              </p>
            )}
          </div>

          <p className="ixia-help text-xs">
            After signing in, you’ll see an “Unlock purchase” button if we detect an unclaimed order.
          </p>
        </div>
      )}


      {showUpgradeGate && (
        <div className="ixia-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            className="ixia-modal__overlay"
            aria-label="Close"
            onClick={() => setMode("idle")}
          />

          <div className="ixia-modal__panel space-y-3">
            <p className="ixia-help ixia-gate-title">Unlock the Advice Pack</p>

            <p className="ixia-help ixia-gate-sub">
              Get 100 advice uses, and use advice across Ixia tools (Wholesale, MakerPrice, and more as
              they’re added).
            </p>

            <ul className="ixia-modal__list">
              <li>Clear “what looks good / what to adjust” guidance</li>
              <li>One simple next step each time</li>
              <li>No jargon, no overwhelm</li>
            </ul>

            <button
              type="button"
              className="ixia-button ixia-button--primary ixia-button--full"
              onClick={openUpgrade}
            >
              Upgrade (Advice Pack)
            </button>

            <p className="ixia-help text-xs">
              Already purchased? Close this and use the sign-in options below.
            </p>

            <button
              type="button"
              className="ixia-button ixia-button--text ixia-button--full"
              onClick={() => setMode("idle")}
            >
              Close
            </button>
          </div>
        </div>
      )}


      {mode === "email_link_needs_email" && (
        <div className="ixia-card space-y-2">
          <p className="ixia-help">
            To finish signing in, enter the email address you used to request the link.
          </p>
          <input
            className="ixia-input"
            type="email"
            placeholder="Email used for sign-in link"
            value={emailToFinishLink}
            onChange={(e) => setEmailToFinishLink(e.target.value)}
          />
          <button
            type="button"
            className="ixia-button ixia-button--primary ixia-button--full"
            onClick={finishEmailLinkSignInManually}
            disabled={loading}
          >
            Finish sign-in
          </button>
        </div>
      )}

      {!!adviceMarkdown && (
        <div className="ixia-card ixia-advice space-y-3">
          <h4 className="ixia-card-title">Advice</h4>
          {/* Desktop-only: collapse advice text, keep CTA visible */}
          <button
            type="button"
            className="ixia-link text-sm hidden lg:inline-flex"
            onClick={() => setIsAdviceCollapsed(v => !v)}
          >
            {isAdviceCollapsed ? "Show advice text" : "Hide advice text"}
          </button>

          {!isAdviceCollapsed && (
            <div className="ixia-advice__body">
              {parseAdviceToSections(adviceMarkdown).map((sec, idx) => (
                <div key={idx} className="ixia-advice__section">
                  <div className="ixia-advice__title">{sec.title}</div>

                  {sec.blocks.map((b, i) => {
                    if (b.kind === "p") {
                      const m = b.text.match(/^([^:]{2,40}):\s+(.*)$/);

                      if (m) {
                        return (
                          <p key={i} className="ixia-advice__p">
                            <span className="ixia-advice__label">{m[1]}:</span> {m[2]}
                          </p>
                        );
                      }

                      return (
                        <p key={i} className="ixia-advice__p">
                          {b.text}
                        </p>
                      );
                    }

                    if (b.kind === "ul") {
                      return (
                        <ul key={i} className="ixia-advice__list ixia-advice__list--bullets">
                          {b.items.map((it, j) => (
                            <li key={j} className="ixia-advice__li">
                              {it}
                            </li>
                          ))}
                        </ul>
                      );
                    }

                    // ordered list
                    return (
                      <ol key={i} className="ixia-advice__list ixia-advice__list--numbers">
                        {b.items.map((it, j) => (
                          <li key={j} className="ixia-advice__li">
                            {it}
                          </li>
                        ))}
                      </ol>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {!!outJson && (
        <details className="ixia-card">
          <summary className="ixia-help">Debug output (temporary)</summary>
          <pre className="ixia-pre">{outJson}</pre>
        </details>
      )}

      <button
        type="button"
        className="ixia-button ixia-button--secondary ixia-button--full"
        onClick={resetSession}
        disabled={loading}
      >
        Reset session (dev)
      </button>
    </section>
  );
}
