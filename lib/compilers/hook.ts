// Copyright (c) 2022, Compiler Explorer Authors
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

import path from 'path';

import {CompilationResult, ExecutionOptions} from '../../types/compilation/compilation.interfaces';
import {BasicExecutionResult, ExecutableExecutionOptions} from '../../types/execution/execution.interfaces';
import {ParseFiltersAndOutputOptions} from '../../types/features/filters.interfaces';
import {BaseCompiler} from '../base-compiler';

export class HookCompiler extends BaseCompiler {
    static get key(): string {
        return 'hook';
    }

    override optionsForFilter(filters: ParseFiltersAndOutputOptions): string[] {
        return ['--dump'];
    }

    override getOutputFilename(dirPath: string): string {
        return path.join(dirPath, 'example.out');
    }

    override async execBinary(
        executable,
        maxSize,
        executeParameters: ExecutableExecutionOptions,
        homeDir,
    ): Promise<BasicExecutionResult> {
        const compilerPath = path.dirname(this.compiler.exe);
        executeParameters.env = {HOOK_HOME: path.join(compilerPath, '..'), ...executeParameters.env};

        return super.execBinary(executable, maxSize, executeParameters, homeDir);
    }

    override async runCompiler(
        compiler: string,
        options: string[],
        inputFilename: string,
        execOptions: ExecutionOptions,
    ): Promise<CompilationResult> {
        const dirPath = path.dirname(inputFilename);
        const outputFilename = this.getOutputFilename(dirPath);
        options.push(outputFilename);
        return super.runCompiler(compiler, options, inputFilename, execOptions);
    }

    override processAsm(result, filters, options) {
        // Ignoring `trim` filter because it is not supported by Hook.
        filters.trim = false;
        const _result = super.processAsm(result, filters, options);
        const commentRegex = /^\s*;(.*)/;
        const instructionRegex = /^\s{2}(\d+)(.*)/;
        const asm = _result.asm;
        let lastLineNo: number | undefined;
        for (const item of asm) {
            const text = item.text;
            if (commentRegex.test(text)) {
                item.source = {line: undefined, file: null};
                lastLineNo = undefined;
                continue;
            }
            const match = text.match(instructionRegex);
            if (match) {
                const lineNo = parseInt(match[1]);
                item.source = {line: lineNo, file: null};
                lastLineNo = lineNo;
                continue;
            }
            if (text) {
                item.source = {line: lastLineNo, file: null};
                continue;
            }
            item.source = {line: undefined, file: null};
            lastLineNo = undefined;
        }
        _result.asm = asm;
        return _result;
    }
}
