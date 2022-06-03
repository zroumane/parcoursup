require("dotenv").config();
const fetch = require("node-fetch");
const { parse } = require("node-html-parser");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const dayjs = require("dayjs");

const start = async () => {
  let response = await fetch("https://dossierappel.parcoursup.fr/Candidat/authentification", {
    credentials: "omit",
    method: "GET",
    mode: "cors",
  });

  let cookie = response.headers.get("set-cookie").slice(0, 43);
  let csrf = parse(await response.text())
    .querySelector("#CSRFToken")
    .getAttribute("value");

  response = await fetch(
    `https://dossierappel.parcoursup.fr/Candidat/authentification;${cookie.toLocaleLowerCase()}?`,
    {
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookie,
      },
      body: `ACTION=1&usermobile=false&CSRFToken=${csrf}&g_cn_cod=${process.env.DOSSIER}&g_cn_mot_pas=${process.env.PASSWORD}`,
      method: "POST",
      mode: "cors",
    }
  );

  if (response.url.includes("session.expiree")) {
    console.log("Can't login");
    process.exit(0);
  } else console.log("Fetched parcoursup");

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
};

start();
