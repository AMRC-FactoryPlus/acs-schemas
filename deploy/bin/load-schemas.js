import $fs from "fs/promises";

import { GIT_VERSION }  from "../lib/git-version.js";
import { ServiceClient, UUIDs } from "@amrc-factoryplus/service-client";

const App = {
    Schema:         "b16e85fb-53c2-49f9-8d83-cdf6763304ba",
    Metadata:       "32093857-9d29-470e-a897-d2b56d5aa978",
};
const Class = {
    Private:        "eda329ca-4e55-4a92-812d-df74993c47e2",
};

console.log(`ACS schemas revision ${GIT_VERSION}`);

const schemas = JSON.parse(await $fs.readFile("schemas.json"));

const fplus = await new ServiceClient({ env: process.env }).init();
const cdb = fplus.ConfigDB;
const log = fplus.debug.bound("schemas");

log("Creating required Apps");
await cdb.create_object(UUIDs.Class.App, App.Schema);
await cdb.put_config(UUIDs.App.Info, App.Schema,
    { name: "JSON schema" });
await cdb.create_object(UUIDs.Class.App, App.Metadata);
await cdb.put_config(UUIDs.App.Info, App.Metadata,
    { name: "Metric schema info" });

log("Creating required Classes");
await cdb.create_object(UUIDs.Class.Class, Class.Private);
await cdb.put_config(UUIDs.App.Info, Class.Private,
    { name: "Private configuration" });

for (const [uuid, { metadata, schema }] of Object.entries(schemas)) {
    log("Updating schema %s v%s (%s)", 
        metadata.name, metadata.version, uuid);

    await cdb.create_object(UUIDs.Class.Schema, uuid);

    /* XXX It might be better to use the schema title here? But at the
     * moment those aren't unique. */
    const name = `${metadata.name} (v${metadata.version})`;
    await cdb.put_config(UUIDs.App.Info, uuid, { name });
    await cdb.put_config(App.Metadata, uuid, metadata);
    await cdb.put_config(App.Schema, uuid, schema);
}

const priv = JSON.parse(await $fs.readFile("private.json"));

for (const [uuid, schema] of Object.entries(priv)) {
    const name = schema.title ?? uuid;
    log("Updating private schema %s", name);
    await cdb.create_object(Class.Private, uuid);
    if (schema.title)
        await cdb.put_config(UUIDs.App.Info, uuid, { name: schema.title });
    await cdb.put_config(App.Schema, uuid, schema);
}

log("Done");
