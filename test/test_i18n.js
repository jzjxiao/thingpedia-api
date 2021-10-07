// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Thingpedia
//
// Copyright 2020 The Board of Trustees of the Leland Stanford Junior University
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>


import assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';

import ModuleDownloader from '../lib/downloader';
import BaseDevice from '../lib/base_device';

import { MockPlatform, MockEngine } from './mock';

const Builtins = {
    'org.thingpedia.builtin.translatable': {
        class: fs.readFileSync(path.resolve(path.dirname(module.filename), './device-classes/org.thingpedia.builtin.translatable.tt'), { encoding: 'utf8' }),

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        module: class TranslatableBuiltin extends BaseDevice {
            get_elements() {
                return [];
            }
        }
    }
};

async function testBuiltin() {
    const platform = new MockPlatform('it-IT');
    const engine = new MockEngine(platform);
    const tpClient = platform.getCapability('thingpedia-client');
    const gettext = platform.getCapability('gettext');

    const downloader = new ModuleDownloader(platform, tpClient, engine.schemas, Builtins, {
        builtinGettext: (x) => gettext.dgettext('thingengine-core', x)
    });
    const module = await downloader.getModule('org.thingpedia.builtin.translatable');

    assert.strictEqual(module.manifest.prettyprint(), `class @org.thingpedia.builtin.translatable
#_[name="Predefinito Traducibile"]
#_[description="Descrizione del Predefinito Traducibile"]
#[version=0] {
  import loader from @org.thingpedia.builtin();

  import config from @org.thingpedia.config.builtin();

  monitorable query elements(out something : String
                             #_[canonical="qualcosa"],
                             out author : Entity(tt:username)
                             #_[canonical={
                               npp=["autore"],
                               pvp=["scritto da"],
                               default="npp"
                             }])
  #_[confirmation="elementi predefiniti dentro la roba"]
  #_[canonical="elementi"]
  #[poll_interval=1ms]
  #[minimal_projection=[]];
}`);

    const _class = await module.getDeviceClass();
    const dev = new _class(engine, { kind: 'org.thingpedia.builtin.translatable' });

    assert.strictEqual(dev.name, 'Predefinito Traducibile');
    assert.strictEqual(dev.description, 'Descrizione del Predefinito Traducibile');
}

async function testOnDisk() {
    // first test English
    {
        const platform = new MockPlatform('en-US');
        const engine = new MockEngine(platform);
        const tpClient = platform.getCapability('thingpedia-client');

        const downloader = new ModuleDownloader(platform, tpClient, engine.schemas);
        const module = await downloader.getModule('org.thingpedia.test.translatable');

        const _class = await module.getDeviceClass();
        const instance = new _class(engine, {
            kind: 'org.thingpedia.test.translatable'
        });

        assert.deepStrictEqual(await instance.get_elements(), [
            { something: 'stuff', author: 'someone' }
        ]);
    }

    // now test Italian
    {
        const platform = new MockPlatform('it-IT');
        const engine = new MockEngine(platform);
        const tpClient = platform.getCapability('thingpedia-client');

        const downloader = new ModuleDownloader(platform, tpClient, engine.schemas);
        const module = await downloader.getModule('org.thingpedia.test.translatable');

        const _class = await module.getDeviceClass();
        const instance = new _class(engine, {
            kind: 'org.thingpedia.test.translatable'
        });

        assert.deepStrictEqual(await instance.get_elements(), [
            { something: 'roba', author: 'qualcuno' }
        ]);
    }
}

async function main() {
    if (!fs.existsSync(path.resolve(path.dirname(module.filename), './po/it.mo'))) {
        child_process.spawnSync('msgfmt', [
            '-o', path.resolve(path.dirname(module.filename), './po/it.mo'),
            path.resolve(path.dirname(module.filename), './po/it.po')
        ]);
    }

    await testBuiltin();
    await testOnDisk();
}
export default main;
if (!module.parent)
    main();
