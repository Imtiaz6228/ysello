import fs from "node:fs";
// Inventory must come from live backend HTML; remove legacy demo catalog exports.
for (const name of ["category", "categories", "product", "products", "stores", "catalog.html", "sitemap.xml", "robots.txt"])
  fs.rmSync(`dist/${name}`, {recursive:true,force:true});
