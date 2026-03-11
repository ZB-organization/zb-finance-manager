/**
 * Settlement — CEO net settlement page.
 * Includes the portal-based SettlementAnimation (coin-transfer → success burst).
 */
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ArrowLeftRight,
  AlertCircle,
  Banknote,
  History,
  Clock3,
  BadgeCheck,
  CheckCircle,
} from "lucide-react";
import { usePalette } from "../theme";
import { GEN_ID, FMT, TS } from "../constants";
import { calcDebt } from "../calc";
import { Card, useChannels } from "../components/Shared";
import { ProgressBar } from "../components/ProgressBar";
import { loadSettlements, saveSettlement } from "../db";
import SuccessComponent from "../components/SuccessComponent";

/* ════════════════════════════════════════════════════════════
   SETTLEMENT ANIMATION
════════════════════════════════════════════════════════════ */
const COIN_DEFS = [
  { emoji: "💰", yOff: -12, delay: 0 },
  { emoji: "🪙", yOff: 4, delay: 200 },
  { emoji: "💸", yOff: -4, delay: 400 },
  { emoji: "💰", yOff: 10, delay: 600 },
  { emoji: "🪙", yOff: -8, delay: 800 },
];

const BURST_CFG = [
  { color: "#10b981", angle: 0, dist: 78 },
  { color: "#06b6d4", angle: 45, dist: 88 },
  { color: "#ec4899", angle: 90, dist: 78 },
  { color: "#f59e0b", angle: 135, dist: 88 },
  { color: "#a78bfa", angle: 180, dist: 78 },
  { color: "#34d399", angle: 225, dist: 88 },
  { color: "#fb923c", angle: 270, dist: 78 },
  { color: "#60a5fa", angle: 315, dist: 88 },
];

function SettlementAnimation({
  payerLabel,
  payerColor,
  receiverLabel,
  receiverColor,
  amount,
  onDone,
  payerImg,
  receiverImg,
}) {
  const [phase, setPhase] = useState("fly");
  const [coins, setCoins] = useState([]);
  const [progress, setProgress] = useState(0);
  const [burstFired, setBurstFired] = useState(false);
  const [checkIn, setCheckIn] = useState(false);
  const [textIn, setTextIn] = useState(false);
  const [cardIn, setCardIn] = useState(false);
  const cbRef = useRef(onDone);
  cbRef.current = onDone;

  useEffect(() => {
    setTimeout(() => setCardIn(true), 20);
    setTimeout(() => setProgress(100), 60);

    COIN_DEFS.forEach((c, i) => {
      setTimeout(() => {
        setCoins((prev) => [
          ...prev,
          { id: i, emoji: c.emoji, yOff: c.yOff, fired: false },
        ]);
        setTimeout(
          () =>
            setCoins((prev) =>
              prev.map((x) => (x.id === i ? { ...x, fired: true } : x)),
            ),
          30,
        );
      }, c.delay);
    });

    const t1 = setTimeout(() => {
      setPhase("done");
      setTimeout(() => {
        setBurstFired(true);
        setCheckIn(true);
      }, 30);
      setTimeout(() => setTextIn(true), 320);
    }, 1900);

    const t2 = setTimeout(() => cbRef.current(), 3600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const AvatarBox = ({ img, label, color, role }) => (
    <div style={{ textAlign: "center", width: 88, flexShrink: 0 }}>
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: 18,
          background: color + "22",
          border: `2px solid ${color}66`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 8px",
          boxShadow: `0 0 24px ${color}44`,
          overflow: "hidden",
        }}
      >
        {img ? (
          <img
            src={img}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span style={{ fontSize: 28 }}>👤</span>
        )}
      </div>
      <div
        style={{
          fontSize: 9,
          color,
          fontWeight: 800,
          letterSpacing: 1,
          textTransform: "uppercase",
          marginBottom: 2,
        }}
      >
        {role}
      </div>
      <div style={{ fontSize: 13, fontWeight: 900, color }}>{label}</div>
    </div>
  );

  const content = (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(4,8,22,0.88)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: "linear-gradient(145deg,#0c1525,#0a1020)",
          border: "1px solid rgba(6,182,212,0.3)",
          borderRadius: 28,
          padding: "36px 40px",
          width: 460,
          maxWidth: "90vw",
          boxShadow: "0 40px 100px rgba(0,0,0,0.8)",
          position: "relative",
          transform: cardIn
            ? "scale(1) translateY(0)"
            : "scale(0.88) translateY(28px)",
          opacity: cardIn ? 1 : 0,
          transition:
            "transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease",
        }}
      >
        {phase === "fly" ? (
          <div>
            <div
              style={{
                fontSize: 9,
                fontWeight: 800,
                color: "#06b6d4",
                letterSpacing: 2.5,
                textTransform: "uppercase",
                textAlign: "center",
                marginBottom: 28,
              }}
            >
              💳 Processing Transfer
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: 28,
              }}
            >
              <AvatarBox
                img={payerImg}
                label={payerLabel}
                color={payerColor}
                role="PAYS"
              />

              {/* Coin lane */}
              <div style={{ flex: 1, height: 72, position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: 4,
                    right: 4,
                    height: 1,
                    background: `linear-gradient(90deg,${payerColor}55,${receiverColor}55)`,
                    transform: "translateY(-50%)",
                  }}
                />
                {coins.map((c) => (
                  <div
                    key={c.id}
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: 0,
                      marginTop: c.yOff - 9,
                      fontSize: 18,
                      lineHeight: 1,
                      transform: c.fired
                        ? "translateX(248px) scale(0.4)"
                        : "translateX(-4px) scale(1)",
                      opacity: c.fired ? 0 : 1,
                      transition: c.fired
                        ? "transform 0.95s cubic-bezier(0.4,0,1,1), opacity 0.5s ease 0.6s"
                        : "none",
                    }}
                  >
                    {c.emoji}
                  </div>
                ))}
                {/* Amount badge */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      background: "rgba(8,14,30,0.9)",
                      border: "1px solid rgba(6,182,212,0.4)",
                      borderRadius: 10,
                      padding: "5px 14px",
                    }}
                  >
                    <span
                      style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}
                    >
                      ৳{FMT(amount)}
                    </span>
                  </div>
                </div>
              </div>

              <AvatarBox
                img={receiverImg}
                label={receiverLabel}
                color={receiverColor}
                role="RECEIVES"
              />
            </div>

            {/* Progress bar */}
            <div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(100,160,200,0.7)",
                  marginBottom: 7,
                }}
              >
                Transferring funds…
              </div>
              <div
                style={{
                  height: 6,
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.07)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    borderRadius: 6,
                    background:
                      "linear-gradient(90deg,#0d9488,#06b6d4,#a78bfa)",
                    boxShadow: "0 0 14px rgba(6,182,212,0.6)",
                    width: `${progress}%`,
                    transition: "width 1.85s cubic-bezier(0.4,0,0.2,1)",
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Phase 2: success */
          <div style={{ textAlign: "center", padding: "6px 0" }}>
            <div
              style={{
                position: "relative",
                width: 104,
                height: 104,
                margin: "0 auto 22px",
              }}
            >
              {BURST_CFG.map(({ color, angle, dist }, i) => {
                const rad = (angle * Math.PI) / 180;
                const tx = burstFired ? Math.cos(rad) * dist : 0;
                const ty = burstFired ? Math.sin(rad) * dist : 0;
                return (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      width: 11,
                      height: 11,
                      borderRadius: "50%",
                      background: color,
                      boxShadow: `0 0 8px ${color}`,
                      marginTop: -5.5,
                      marginLeft: -5.5,
                      transform: `translate(${tx}px,${ty}px) scale(${
                        burstFired ? 0 : 1.3
                      })`,
                      opacity: burstFired ? 0 : 1,
                      transition: `transform 0.7s cubic-bezier(0.2,0,0.8,1) ${
                        i * 20
                      }ms, opacity 0.5s ease ${i * 20 + 280}ms`,
                    }}
                  />
                );
              })}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background: "rgba(16,185,129,0.15)",
                  border: "2px solid #10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow:
                    "0 0 0 10px rgba(16,185,129,0.07), 0 0 40px rgba(16,185,129,0.35)",
                  transform: checkIn
                    ? "scale(1) rotate(0deg)"
                    : "scale(0.15) rotate(-25deg)",
                  opacity: checkIn ? 1 : 0,
                  transition:
                    "transform 0.55s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease",
                }}
              >
                <span style={{ fontSize: 46 }}>✅</span>
              </div>
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: "#10b981",
                marginBottom: 10,
                transform: textIn ? "translateY(0)" : "translateY(16px)",
                opacity: textIn ? 1 : 0,
                transition: "transform 0.4s ease, opacity 0.4s ease",
              }}
            >
              All Settled! 🎉
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#94a3b8",
                lineHeight: 2,
                transform: textIn ? "translateY(0)" : "translateY(16px)",
                opacity: textIn ? 1 : 0,
                transition:
                  "transform 0.4s ease 0.08s, opacity 0.4s ease 0.08s",
              }}
            >
              <span style={{ color: payerColor, fontWeight: 800 }}>
                {payerLabel}
              </span>
              <span style={{ color: "#475569" }}> → </span>
              <span style={{ color: receiverColor, fontWeight: 800 }}>
                {receiverLabel}
              </span>
              <br />
              <span style={{ fontSize: 20, fontWeight: 900, color: "#fff" }}>
                ৳{FMT(amount)}
              </span>
              <span style={{ color: "#475569", fontSize: 12 }}>
                {" "}
                · balance now zero
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

/* ════════════════════════════════════════════════════════════
   SETTLEMENT PAGE
════════════════════════════════════════════════════════════ */
export default function Settlement({
  projects,
  currencies,
  expenses,
  settledBaseline,
  onLog,
  onSettle,
  ceoImages,
}) {
  const pal = usePalette();
  const channelDefs = useChannels();
  const [settlements, setSettlements] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [animSnap, setAnimSnap] = useState(null);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    loadSettlements().then(setSettlements);
  }, []);

  const debt = useMemo(
    () =>
      calcDebt(projects, currencies, expenses, settledBaseline, channelDefs),
    [projects, currencies, expenses, settledBaseline, channelDefs],
  );
  const balanced = !debt.payer || debt.amount < 0.01;

  const handleMarkSettled = async () => {
    if (balanced) return;
    const snap = {
      payer: debt.payer,
      payerLabel: debt.payerLabel,
      payerColor: debt.payer === "sumaiya" ? "#ec4899" : "#3b82f6",
      receiver: debt.receiver,
      receiverLabel: debt.receiverLabel,
      receiverColor: debt.receiver === "sumaiya" ? "#ec4899" : "#3b82f6",
      amount: debt.amount,
    };
    setAnimSnap(snap);
    setConfirming(false);
    setAnimating(true);

    const rec = {
      id: GEN_ID(),
      payer: debt.payer,
      payerLabel: debt.payerLabel,
      receiver: debt.receiver,
      receiverLabel: debt.receiverLabel,
      amount: debt.amount,
      settledAt: TS(),
      projectCount: projects.length,
    };
    await saveSettlement(rec);
    setSettlements(await loadSettlements());
    await onSettle(debt.raw);
    onLog({
      type: "SETTLEMENT",
      detail: `${debt.payerLabel} paid ${debt.receiverLabel} ৳${FMT(
        debt.amount,
      )}`,
    });
  };

  const handleAnimDone = useCallback(() => {
    setAnimating(false);
    setAnimSnap(null);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 3500);
  }, []);

  const pC = debt.payer === "sumaiya" ? "#ec4899" : "#3b82f6";
  const rC = debt.receiver === "sumaiya" ? "#ec4899" : "#3b82f6";

  return (
    <div style={{ paddingBottom: 48 }}>
      {animating && animSnap && (
        <SettlementAnimation
          payerLabel={animSnap.payerLabel}
          payerColor={animSnap.payerColor}
          receiverLabel={animSnap.receiverLabel}
          receiverColor={animSnap.receiverColor}
          amount={animSnap.amount}
          onDone={handleAnimDone}
          payerImg={
            animSnap.payer === "sumaiya" ? ceoImages?.sumaiya : ceoImages?.rakib
          }
          receiverImg={
            animSnap.receiver === "sumaiya"
              ? ceoImages?.sumaiya
              : ceoImages?.rakib
          }
        />
      )}

      <div style={{ marginBottom: 24 }}>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 900,
            color: pal.text,
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <ArrowLeftRight size={20} color="#06b6d4" /> Net Settlement
        </h2>
        <p style={{ color: pal.textMute, marginTop: 5, fontSize: 13 }}>
          Who owes whom based on where money was received vs who earned it
        </p>
      </div>

      <Card
        style={{
          padding: 16,
          marginBottom: 18,
          borderLeft: "3px solid rgba(6,182,212,0.5)",
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <AlertCircle
            size={15}
            color="#06b6d4"
            style={{ flexShrink: 0, marginTop: 2 }}
          />
          <div style={{ fontSize: 12.5, color: pal.textSub, lineHeight: 1.75 }}>
            <strong style={{ color: "#06b6d4" }}>Logic:</strong> When money
            lands in Sumaiya's account, she holds Rakib's share (and vice
            versa). The net of all these cross-account obligations is the
            settlement amount.
          </div>
        </div>
      </Card>

      {/* Gross obligations */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
          gap: 14,
          marginBottom: 18,
        }}
      >
        {[
          {
            label: "Sumaiya's acct holds Rakib's share",
            amt: debt.raw?.sumaiyaOwesRakib || 0,
            color: "#ec4899",
          },
          {
            label: "Rakib's acct holds Sumaiya's share",
            amt: debt.raw?.rakibOwesSumaiya || 0,
            color: "#3b82f6",
          },
        ].map(({ label, amt, color }) => {
          const maxAmt =
            Math.max(
              debt.raw?.sumaiyaOwesRakib || 0,
              debt.raw?.rakibOwesSumaiya || 0,
            ) || 1;
          return (
            <Card key={label} style={{ padding: 20 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: color + "1a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Banknote size={15} color={color} />
                </div>
                <span
                  style={{
                    fontSize: 11,
                    color: pal.textMute,
                    fontWeight: 600,
                    flex: 1,
                    lineHeight: 1.3,
                  }}
                >
                  {label}
                </span>
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  color,
                  marginBottom: 10,
                }}
              >
                ৳{FMT(amt)}
              </div>
              <ProgressBar
                value={(amt / maxAmt) * 100}
                color={color}
                height={6}
              />
            </Card>
          );
        })}
      </div>

      {/* Net card */}
      <div
        style={{
          borderRadius: 20,
          padding: 30,
          marginBottom: 22,
          position: "relative",
          overflow: "hidden",
          background: balanced
            ? "rgba(16,185,129,0.06)"
            : `linear-gradient(135deg,${pC}07,rgba(6,182,212,0.06))`,
          border: balanced
            ? "1px solid rgba(16,185,129,0.22)"
            : "1px solid rgba(6,182,212,0.2)",
          boxShadow: balanced ? "none" : `0 8px 40px ${pC}12`,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -50,
            right: -50,
            width: 180,
            height: 180,
            borderRadius: "50%",
            background: `radial-gradient(circle,${
              balanced ? "#10b981" : "#06b6d4"
            }12 0%,transparent 70%)`,
            pointerEvents: "none",
          }}
        />

        {justSaved ? (
          <div style={{ textAlign: "center" }}>
            <CheckCircle
              size={32}
              color="#10b981"
              style={{ margin: "0 auto 12px", display: "block" }}
            />
            <div style={{ fontSize: 18, fontWeight: 900, color: "#10b981" }}>
              Settlement Recorded!
            </div>
            <div style={{ fontSize: 13, color: pal.textMute, marginTop: 6 }}>
              Balance has been reset to zero.
            </div>
          </div>
        ) : balanced ? (
          <div style={{ textAlign: "center" }}>
            {/* <div style={{ fontSize: 44, marginBottom: 10 }}>✅</div> */}
            <SuccessComponent />
            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: "#10b981",
                marginBottom: 6,
              }}
            >
              All Balanced!
            </div>
            <div style={{ fontSize: 13, color: pal.textMute }}>
              No outstanding obligations between CEOs.
            </div>
          </div>
        ) : (
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: pal.textMute,
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 18,
              }}
            >
              Net Settlement Required
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 24,
                flexWrap: "wrap",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 13,
                    color: pC,
                    fontWeight: 800,
                    marginBottom: 4,
                  }}
                >
                  {debt.payerLabel}
                </div>
                <div style={{ fontSize: 11, color: pal.textMute }}>pays</div>
              </div>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 900,
                    color: pal.text,
                    letterSpacing: -1,
                  }}
                >
                  ৳{FMT(debt.amount)}
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: 13,
                    color: rC,
                    fontWeight: 800,
                    marginBottom: 4,
                  }}
                >
                  {debt.receiverLabel}
                </div>
                <div style={{ fontSize: 11, color: pal.textMute }}>
                  receives
                </div>
              </div>
            </div>
            {!confirming ? (
              <button
                onClick={() => setConfirming(true)}
                style={{
                  width: "100%",
                  padding: "14px 0",
                  background: "linear-gradient(135deg,#0d9488,#06b6d4)",
                  border: "none",
                  borderRadius: 14,
                  color: "#fff",
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  boxShadow: "0 6px 24px rgba(6,182,212,0.4)",
                }}
              >
                Mark as Settled
              </button>
            ) : (
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={() => setConfirming(false)}
                  style={{
                    flex: 1,
                    padding: "12px 0",
                    background: "transparent",
                    border: `1px solid ${pal.border}`,
                    borderRadius: 12,
                    color: pal.textMute,
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: 14,
                    fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkSettled}
                  style={{
                    flex: 2,
                    padding: "12px 0",
                    background: "linear-gradient(135deg,#10b981,#06b6d4)",
                    border: "none",
                    borderRadius: 12,
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  ✓ Confirm Settlement
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Expense adjustments table */}
      {expenses.filter((e) => e.linkedToSettlement).length > 0 && (
        <Card style={{ padding: 20, marginBottom: 18 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: pal.text,
              marginBottom: 14,
            }}
          >
            Linked Expense Adjustments
          </div>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12.5,
              }}
            >
              <thead>
                <tr>
                  {[
                    "Expense",
                    "Paid By",
                    "Amount",
                    "Settlement Adjustment",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "7px 10px",
                        fontWeight: 700,
                        fontSize: 10.5,
                        textTransform: "uppercase",
                        letterSpacing: 0.5,
                        color: pal.textMute,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {expenses
                  .filter((e) => e.linkedToSettlement)
                  .map((e) => {
                    const half = (e.amountBDT || 0) / 2;
                    const adjColor =
                      e.paidBy === "Sumaiya" ? "#ec4899" : "#3b82f6";
                    const adjText =
                      e.paidBy === "Sumaiya"
                        ? `Rakib owes Sumaiya ৳${FMT(half)}`
                        : e.paidBy === "Rakib"
                        ? `Sumaiya owes Rakib ৳${FMT(half)}`
                        : "Split equally (no adjustment)";
                    return (
                      <tr
                        key={e.id}
                        style={{ borderTop: `1px solid ${pal.border}` }}
                      >
                        <td
                          style={{
                            padding: "10px",
                            color: pal.text,
                            fontWeight: 600,
                          }}
                        >
                          {e.description}
                        </td>
                        <td style={{ padding: "10px" }}>
                          <span
                            style={{
                              color:
                                e.paidBy === "Sumaiya"
                                  ? "#ec4899"
                                  : e.paidBy === "Rakib"
                                  ? "#3b82f6"
                                  : "#10b981",
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          >
                            {e.paidBy}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "10px",
                            color: "#f59e0b",
                            fontWeight: 700,
                          }}
                        >
                          ৳{FMT(e.amountBDT || 0)}
                        </td>
                        <td
                          style={{
                            padding: "10px",
                            color: adjColor,
                            fontWeight: 600,
                            fontSize: 11.5,
                          }}
                        >
                          {adjText}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: `2px solid ${pal.border}` }}>
                  <td
                    colSpan={2}
                    style={{
                      padding: "10px",
                      color: pal.textMute,
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    Total expense adjustment to settlement
                  </td>
                  <td
                    colSpan={2}
                    style={{
                      padding: "10px",
                      fontWeight: 900,
                      fontSize: 14,
                      color: "#f59e0b",
                    }}
                  >
                    {(() => {
                      const sc = debt.raw?.expSumaiyaCredit || 0;
                      const rc = debt.raw?.expRakibCredit || 0;
                      if (sc > rc) return `+৳${FMT(sc - rc)} → favours Sumaiya`;
                      if (rc > sc) return `+৳${FMT(rc - sc)} → favours Rakib`;
                      return "Balanced";
                    })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* History */}
      <Card style={{ padding: 20 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: pal.text,
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <History size={15} color="#06b6d4" /> Settlement History (
          {settlements.length})
        </div>
        {settlements.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "28px 0",
              color: pal.textFaint,
            }}
          >
            <Clock3
              size={34}
              strokeWidth={1}
              style={{ margin: "0 auto 10px", display: "block" }}
            />
            <div style={{ fontSize: 13 }}>No settlements recorded yet</div>
          </div>
        ) : (
          [...settlements].reverse().map((s) => (
            <div
              key={s.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 14px",
                marginBottom: 8,
                borderRadius: 12,
                background: pal.surfaceElevated,
                border: `1px solid ${pal.border}`,
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 11,
                  background: "rgba(16,185,129,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <BadgeCheck size={18} color="#10b981" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: pal.text }}>
                  <span
                    style={{
                      color: s.payer === "sumaiya" ? "#ec4899" : "#3b82f6",
                    }}
                  >
                    {s.payerLabel}
                  </span>
                  <span style={{ color: pal.textMute, fontWeight: 400 }}>
                    {" "}
                    paid{" "}
                  </span>
                  <span
                    style={{
                      color: s.receiver === "sumaiya" ? "#ec4899" : "#3b82f6",
                    }}
                  >
                    {s.receiverLabel}
                  </span>
                </div>
                <div
                  style={{ fontSize: 11, color: pal.textMute, marginTop: 2 }}
                >
                  {new Date(s.settledAt).toLocaleString("en-BD", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}{" "}
                  · {s.projectCount} projects
                </div>
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 900,
                  color: "#10b981",
                  flexShrink: 0,
                }}
              >
                ৳{FMT(s.amount)}
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
