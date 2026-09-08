import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as si from 'react-icons/si';
import * as fa from 'react-icons/fa';
import * as pi from 'react-icons/pi';
import { mkdirSync, writeFileSync } from 'node:fs';
const brands = {
 facebook:[si.SiFacebook,'1877f2'], instagram:[si.SiInstagram,'e4405f'], gmail:[si.SiGmail,'ea4335'], telegram:[si.SiTelegram,'26a5e4'], outlook:[pi.PiMicrosoftOutlookLogoFill,'0078d4'], x:[si.SiX,'101010'], tiktok:[si.SiTiktok,'111111'], discord:[si.SiDiscord,'5865f2'], whatsapp:[si.SiWhatsapp,'25d366'], youtube:[si.SiYoutube,'ff0000'], threads:[si.SiThreads,'111111'], reddit:[fa.FaRedditAlien,'ff4500'], snapchat:[si.SiSnapchat,'111111'], linkedin:[fa.FaLinkedin,'0a66c2'], pinterest:[si.SiPinterest,'e60023'], yahoo:[fa.FaYahoo,'6001d2'], protonmail:[si.SiProtonmail,'6d4aff'], chatgpt:[pi.PiOpenAiLogo,'111111'], claude:[si.SiClaude,'d97757'], gemini:[si.SiGooglegemini,'4285f4'], netflix:[si.SiNetflix,'e50914'], spotify:[si.SiSpotify,'1db954'], steam:[fa.FaSteam,'171a21'], vk:[si.SiVk,'0077ff'], streaming:[si.SiTwitch,'9146ff'], google:[fa.FaGoogle,'4285f4']
};
mkdirSync('public/brand-icons',{recursive:true});
for(const [slug,[Icon,color]] of Object.entries(brands)) {
  if(!Icon) throw new Error(`Missing bundled icon: ${slug}`);
  let svg=renderToStaticMarkup(React.createElement(Icon,{size:160,color:`#${color}`}));
  svg=svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  writeFileSync(`public/brand-icons/${slug}.svg`,svg);
}
console.log(`Built ${Object.keys(brands).length} self-hosted platform logos from bundled vector icons.`);
