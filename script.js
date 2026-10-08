const $ = (x) => document.getElementById(x),
  dlg = $("dlg");
let interval = null,
  hold = null;
function toast(t) {
  let x = $("toast");
  x.textContent = t;
  x.classList.add("show");
  setTimeout(() => x.classList.remove("show"), 2600);
}
function sos(source) {
  let n = 5;
  $("dtext").textContent =
    `${source} recognized. Emergency action can continue after the countdown.`;
  $("count").textContent = n;
  dlg.showModal();
  clearInterval(interval);
  interval = setInterval(() => {
    n--;
    $("count").textContent = n;
    if (n <= 0) {
      clearInterval(interval);
      dlg.close();
      finish();
    }
  }, 1000);
}
function finish() {
  toast(
    "Emergency mode activated • Native app can continue to configured emergency action",
  );
}
$("sos").addEventListener("pointerdown", () => {
  let start = Date.now();
  $("holdbar").style.width = "0";
  hold = setInterval(() => {
    let p = Math.min(100, ((Date.now() - start) / 1500) * 100);
    $("holdbar").style.width = p + "%";
    if (p >= 100) {
      clearInterval(hold);
      hold = null;
      sos("SOS button");
    }
  }, 25);
});
["pointerup", "pointerleave", "pointercancel"].forEach((e) =>
  $("sos").addEventListener(e, () => {
    if (hold) {
      clearInterval(hold);
      hold = null;
      $("holdbar").style.width = "0";
    }
  }),
);
$("cancel").onclick = () => {
  clearInterval(interval);
  dlg.close();
  toast("SOS cancelled. You are still in control.");
};
$("go").onclick = () => {
  clearInterval(interval);
  dlg.close();
  finish();
};
$("contact").onclick = () => {
  let old = localStorage.getItem("nrContact") || "";
  let n = prompt("Trusted contact name", old);
  if (n) {
    localStorage.setItem("nrContact", n);
    toast("✓ Trusted contact saved locally");
  }
};
$("loc").onclick = () => {
  if (!navigator.geolocation) {
    toast("Geolocation is unavailable in this browser");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (p) =>
      toast(
        `Location ready: ${p.coords.latitude.toFixed(5)}, ${p.coords.longitude.toFixed(5)}`,
      ),
    () => toast("Location permission was denied or unavailable"),
  );
};
$("check").onclick = () => {
  toast("✓ 5-minute safety check-in started");
  let end = Date.now() + 300000;
  let i = setInterval(() => {
    if (Date.now() >= end) {
      clearInterval(i);
      toast("Check-in ended. Please make sure you are safe.");
    }
  }, 1000);
};

const pad = $("pad"),
  c = $("canvas"),
  ctx = c.getContext("2d");
let pts = [],
  draw = false;
function size() {
  c.width = pad.clientWidth * devicePixelRatio;
  c.height = pad.clientHeight * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#e85b87";
}
size();
addEventListener("resize", size);
function point(e) {
  let r = c.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
c.onpointerdown = (e) => {
  draw = true;
  pts = [point(e)];
  let p = pts[0];
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  $("hint").style.display = "none";
  c.setPointerCapture(e.pointerId);
};
c.onpointermove = (e) => {
  if (!draw) return;
  let p = point(e);
  pts.push(p);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
};
c.onpointerup = () => {
  draw = false;
  recognize();
};
function recognize() {
  if (pts.length < 12) return reset();
  let minX = 1e9,
    maxX = -1e9,
    minY = 1e9,
    maxY = -1e9;
  pts.forEach((p) => {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  });
  let w = maxX - minX,
    h = maxY - minY,
    low = pts.reduce((a, p, i) => (p.y > a.y ? { ...p, i } : a), {
      y: -1e9,
      i: 0,
    });
  let ok =
    w > 65 &&
    h > 55 &&
    pts[0].x < minX + w * 0.38 &&
    pts.at(-1).x > minX + w * 0.62 &&
    low.y > minY + h * 0.55 &&
    low.i > pts.length * 0.12 &&
    low.i < pts.length * 0.92;
  $("gstatus").textContent = ok
    ? "✓ V recognized • SOS ready"
    : "Try again • make a clear V";
  if (ok) sos("V gesture");
  setTimeout(reset, 650);
}
function reset() {
  ctx.clearRect(0, 0, pad.clientWidth, pad.clientHeight);
  pts = [];
  $("hint").style.display = "grid";
}
