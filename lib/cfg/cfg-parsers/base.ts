// Copyright (c) 2023, Compiler Explorer Authors
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//
//     * Redistributions of source code must retain the above copyright notice,
//       this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
// LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
// CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
// SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
// INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
// CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
// POSSIBILITY OF SUCH DAMAGE.

import _ from 'underscore';

import {BaseInstructionSetInfo} from '../instruction-sets/base';

import {ResultLine} from '../../../types/resultline/resultline.interfaces';

export class BaseCFGParser {
    static get key() {
        return 'base';
    }

    constructor(public readonly instructionSetInfo: BaseInstructionSetInfo) {}

    isFunctionName(line: ResultLine) {
        return line.text.trim().indexOf('.') !== 0;
    }

    getAsmDirective(txt: string) {
        const pattern = /^\s*(\.[^ L]\S*)/;
        const match = txt.match(pattern);
        if (match !== null) {
            return match[1];
        }
        return null;
    }

    filterTextSection(data: ResultLine[]) {
        let useCurrentSection = true;
        const result: ResultLine[] = [];
        for (const i in data) {
            const x = data[i];
            const directive = this.getAsmDirective(x.text);
            if (directive != null) {
                if (directive === '.text' || directive === '.data') {
                    useCurrentSection = directive === '.text';
                } else if (directive === '.section') {
                    // Only patttern match for now.
                    // Extracting section name would require adjusting demangling code
                    // as demangled name could contain various symbols including ','.
                    useCurrentSection = /\.section\s*"?\.text/.test(x.text);
                } else if (useCurrentSection) {
                    result.push(x);
                }
            } else if (useCurrentSection) {
                result.push(x);
            }
        }
        return result;
    }

    filterData(assembly: ResultLine[]) {
        const jmpLabelRegex = /\.L\d+:/;
        const isCode = x => x && x.text && (x.source !== null || jmpLabelRegex.test(x.text) || this.isFunctionName(x));
        return this.filterTextSection(assembly).map(_.clone).filter(isCode);
    }

    isFunctionEnd(x: string) {
        return x[0] !== ' ' && x[0] !== '.' && x.includes(':');
    }

    isBasicBlockEnd(inst: string, prevInst: string) {
        return inst[0] === '.' || prevInst.includes(' ret');
    }

    extractNodeName(inst: string) {
        return inst.match(/\.L\d+/) + ':';
    }
}
