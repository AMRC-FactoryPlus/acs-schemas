/* Validate JSON schemas */

import $fsp from "fs/promises";
import $path from "path";
import $process from "process";

import Ajv2020 from "ajv/dist/2020.js";
import formats from "ajv-formats";
import Walk from "@root/walk";
import YAML from "yaml";

const path_rx = /^([\w/_]+)-v(\d+).yaml$/;
const id_rx = /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const schemas = new Map();
const paths = new Map();

let exit = 0;
function error (...args) {
    console.log(...args);
    exit = 1;
}

function loadYAML (path) {
    return $fsp.readFile(path, { encoding: "utf-8" })
        .then(YAML.parse);
}

function schemaWalker (schemas) {
    const cwd = $path.resolve();

    return async (err, path, dirent) => {
        if (err) throw err;
        const rel = path.replaceAll("\\", "/")
            .replace("../schemas/", "");

        if (dirent.isDirectory()) return;
        if (!rel.endsWith(".yaml")) return;

        if (!path_rx.test(rel))
            error("Bad schema filename: %s", rel)

        const schema = await loadYAML(path)
            .catch(err => {
                error("YAML error in %s: %s",
                    rel, err.message);
            });
        if (schema == null) return;

        if (!(typeof schema == "object" && "$id" in schema)) {
            error("Not a schema: %s", rel);
            return;
        }

        const id = schema.$id;
        if (!id_rx.test(id)) {
            error("Incorrect $id format in %s", rel);
            return;
        }

        schemas.set(id, schema);
        paths.set(id, rel);
    };
}

function loadSchema (id) {
    if (!schemas.has(id))
        throw `No schema with id ${id}`;
    return schemas.get(id);
}

const ajv = new Ajv2020({
    loadSchema,
    addUsedSchema: false,
    /* XXX We may want to revist these exceptions. Currently they are
     * violated everywhere. */
    strictTypes: false,
    allowMatchingProperties: true,
});
formats(ajv);

await Walk.walk("../schemas", schemaWalker(schemas));

for (const sch of schemas.values()) {
    //console.log(`Checking ${sch.$id}`);
    await ajv.compileAsync(sch)
        .catch(err => {
            error("Error in %s: %s",
                paths.get(sch.$id), err);
        });
}

$process.exit(exit);
