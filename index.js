import "dotenv/config";
import fetch from "node-fetch";
import { parse } from "node-html-parser";
import { GoogleSpreadsheet } from "google-spreadsheet";
import dayjs from "dayjs";

let response = await fetch("https://dossierappel.parcoursup.fr/Candidat/authentification", {
  credentials: "omit",
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:101.0) Gecko/20100101 Firefox/101.0",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  },
  referrer: "https://dossierappel.parcoursup.fr/Candidat/session.expiree",
  method: "GET",
  mode: "cors",
});
let cookie = response.headers.get("set-cookie").slice(0, 43);
let csrf = parse(await response.text())
  .querySelector("#CSRFToken")
  .getAttribute("value");

response = await fetch(`https://dossierappel.parcoursup.fr/Candidat/authentification;${cookie.toLocaleLowerCase()}?`, {
  credentials: "include",
  headers: {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Content-Type": "application/x-www-form-urlencoded",
    Cookie: cookie,
  },
  referrer: "https://dossierappel.parcoursup.fr/Candidat/authentification",
  body: `ACTION=1&usermobile=false&CSRFToken=${csrf}&g_cn_cod=${process.env.DOSSIER}&g_cn_mot_pas=${process.env.PASSWORD}`,
  method: "POST",
  mode: "cors",
});

if (response.url.includes("session.expiree")) {
  console.log("Can't login");
  process.exit(0);
} else {
  console.log("Fetched parcoursup");
}

let document = parse(await response.text());

const doc = new GoogleSpreadsheet(process.env.DOC_ID);
doc.useServiceAccountAuth({
  client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  private_key: process.env.GOOGLE_PRIVATE_KEY,
});
console.log("Fetched spreadsheet");
await doc.loadInfo();
const sheet = doc.sheetsById[process.env.SHEET_ID];
const rows = await sheet.getRows();

for (const row of rows) {
  let rank = document.querySelector(`#lst_att_${row.ID}_0`)?.querySelectorAll("span.strong")[0].innerText ?? 0;
  row.save();
  row[dayjs().format("D-MMM")] = rank;
  console.log(`${row["Voeu"]} edited (${rank})`);
}
