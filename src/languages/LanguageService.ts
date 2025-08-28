interface LanguageConfig {
    id: string;
    displayName: string;
    fileExtensions: string[];
    lineComment: string;
    blockComment?: { start: string; end: string };
    testFramework: string;
    importSyntax: string;
    functionSyntax: string;
    completionPatterns: Record<string, string>;
    keywords: string[];
    bracePairs: Array<[string, string]>;
}

export class LanguageService {
    static getTestImports(language: string) {
      throw new Error("Method not implemented.");
    }
    static detectLanguage(code: string): string {
      throw new Error("Method not implemented.");
    }
    private static languages: Map<string, LanguageConfig> = new Map([
        ['javascript', {
            id: 'javascript',
            displayName: 'JavaScript',
            fileExtensions: ['.js', '.jsx', '.mjs'],
            lineComment: '//',
            blockComment: { start: '/*', end: '*/' },
            testFramework: 'jest',
            importSyntax: "import {} from ''",
            functionSyntax: "function name() {}",
            completionPatterns: {
                'console.': 'log()',
                'document.': 'getElementById()',
                'Math.': 'floor()',
                'Array.': 'isArray()',
                'JSON.': 'stringify()',
                'Object.': 'keys()',
                'Promise.': 'resolve()',
                'function ': '() {}',
                'const ': 'variable = ',
                'let ': 'variable = ',
                'if (': 'condition) {',
                'for (': 'let i = 0; i < array.length; i++) {',
                'while (': 'condition) {',
                'return ': 'value;',
                'await ': 'promise',
                'async ': 'function() {}'
            } as Record<string, string>,
            keywords: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class'],
            bracePairs: [['(', ')'], ['{', '}'], ['[', ']']]
        }],
        
        ['typescript', {
            id: 'typescript',
            displayName: 'TypeScript',
            fileExtensions: ['.ts', '.tsx'],
            lineComment: '//',
            blockComment: { start: '/*', end: '*/' },
            testFramework: 'jest',
            importSyntax: "import {} from ''",
            functionSyntax: "function name(): void {}",
            completionPatterns: {
                'console.': 'log()',
                'document.': 'getElementById()',
                'interface ': 'Name {}',
                'type ': 'Name = ',
                'enum ': 'Name {}',
                'class ': 'Name {}',
                'public ': 'property: type;',
                'private ': 'property: type;',
                'protected ': 'property: type;',
                'readonly ': 'property: type;',
                ': ': 'string',
                '<': 'T>',
                'extends ': 'BaseClass',
                'implements ': 'Interface'
            } as Record<string, string>,
            keywords: ['const', 'let', 'interface', 'type', 'enum', 'class', 'public', 'private', 'protected'],
            bracePairs: [['(', ')'], ['{', '}'], ['[', ']'], ['<', '>']]
        }],
        
        ['python', {
            id: 'python',
            displayName: 'Python',
            fileExtensions: ['.py', '.pyw'],
            lineComment: '#',
            blockComment: { start: '"""', end: '"""' },
            testFramework: 'pytest',
            importSyntax: 'import module',
            functionSyntax: 'def function():',
            completionPatterns: {
                'print': '()',
                'len': '()',
                'range': '()',
                'def ': 'function():',
                'class ': 'ClassName:',
                'if ': 'condition:',
                'elif ': 'condition:',
                'else:': '\n    ',
                'for ': 'item in items:',
                'while ': 'condition:',
                'with ': 'open() as f:',
                'try:': '\n    ',
                'except ': 'Exception:',
                'import ': 'module',
                'from ': 'module import',
                'return ': 'value',
                'lambda ': 'x: x',
                'self.': 'method()',
                '__init__': '(self):',
                '@': 'decorator'
            } as Record<string, string>,
            keywords: ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'with', 'try', 'except', 'import', 'from', 'return', 'lambda'],
            bracePairs: [['(', ')'], ['[', ']'], ['{', '}']]
        }],
        
        ['java', {
            id: 'java',
            displayName: 'Java',
            fileExtensions: ['.java'],
            lineComment: '//',
            blockComment: { start: '/*', end: '*/' },
            testFramework: 'JUnit',
            importSyntax: 'import package.Class;',
            functionSyntax: 'public void method() {}',
            completionPatterns: {
                'System.out.': 'println()',
                'System.err.': 'println()',
                'public ': 'void method() {}',
                'private ': 'String variable;',
                'protected ': 'int variable;',
                'static ': 'final String CONSTANT = ',
                'class ': 'ClassName {}',
                'interface ': 'InterfaceName {}',
                'extends ': 'ParentClass',
                'implements ': 'Interface',
                'new ': 'Object()',
                'throw new ': 'Exception()',
                'try {': '\n    ',
                'catch (': 'Exception e) {',
                'finally {': '\n    ',
                'for (': 'int i = 0; i < length; i++) {',
                'if (': 'condition) {',
                'return ': 'value;',
                '@Override': '\npublic '
            } as Record<string, string>,
            keywords: ['public', 'private', 'protected', 'static', 'final', 'class', 'interface', 'extends', 'implements'],
            bracePairs: [['(', ')'], ['{', '}'], ['[', ']']]
        }],
        
        ['cpp', {
            id: 'cpp',
            displayName: 'C++',
            fileExtensions: ['.cpp', '.cc', '.cxx', '.hpp', '.h'],
            lineComment: '//',
            blockComment: { start: '/*', end: '*/' },
            testFramework: 'GoogleTest',
            importSyntax: '#include <iostream>',
            functionSyntax: 'void function() {}',
            completionPatterns: {
                'std::': 'cout',
                'cout << ': '"text"',
                'cin >> ': 'variable',
                '#include ': '<iostream>',
                'using ': 'namespace std;',
                'class ': 'ClassName {};',
                'struct ': 'StructName {};',
                'public:': '\n    ',
                'private:': '\n    ',
                'protected:': '\n    ',
                'template <': 'typename T>',
                'virtual ': 'void method()',
                'const ': 'int variable = ',
                'nullptr': '',
                'new ': 'Type()',
                'delete ': 'pointer',
                'for (': 'int i = 0; i < n; i++) {',
                'if (': 'condition) {',
                'return ': '0;'
            } as Record<string, string>,
            keywords: ['class', 'struct', 'public', 'private', 'protected', 'virtual', 'const', 'template'],
            bracePairs: [['(', ')'], ['{', '}'], ['[', ']'], ['<', '>']]
        }],
        
        ['csharp', {
            id: 'csharp',
            displayName: 'C#',
            fileExtensions: ['.cs'],
            lineComment: '//',
            blockComment: { start: '/*', end: '*/' },
            testFramework: 'NUnit',
            importSyntax: 'using System;',
            functionSyntax: 'public void Method() {}',
            completionPatterns: {
                'Console.': 'WriteLine()',
                'using ': 'System;',
                'namespace ': 'MyNamespace {}',
                'class ': 'ClassName {}',
                'public ': 'void Method() {}',
                'private ': 'string field;',
                'protected ': 'int Property { get; set; }',
                'static ': 'void Main() {}',
                'var ': 'variable = ',
                'new ': 'Object()',
                'async ': 'Task Method() {}',
                'await ': 'Task.Run()',
                'foreach (': 'var item in collection) {',
                'if (': 'condition) {',
                'return ': 'value;',
                'throw new ': 'Exception()'
            } as Record<string, string>,
            keywords: ['using', 'namespace', 'class', 'public', 'private', 'protected', 'static', 'async', 'await'],
            bracePairs: [['(', ')'], ['{', '}'], ['[', ']'], ['<', '>']]
        }],
        
        ['go', {
            id: 'go',
            displayName: 'Go',
            fileExtensions: ['.go'],
            lineComment: '//',
            blockComment: { start: '/*', end: '*/' },
            testFramework: 'testing',
            importSyntax: 'import "fmt"',
            functionSyntax: 'func name() {}',
            completionPatterns: {
                'fmt.': 'Println()',
                'func ': 'name() {}',
                'var ': 'name = ',
                'const ': 'name = ',
                'type ': 'Name struct {}',
                'package ': 'main',
                'import ': '"fmt"',
                'if ': 'condition {',
                'for ': 'i := 0; i < n; i++ {',
                'range ': 'slice {',
                'return ': 'value',
                'defer ': 'func()',
                'go ': 'func()',
                'chan ': 'int',
                'make(': 'map[string]int)'
            } as Record<string, string>,
            keywords: ['func', 'var', 'const', 'type', 'package', 'import', 'if', 'for', 'range', 'return', 'defer', 'go', 'chan'],
            bracePairs: [['(', ')'], ['{', '}'], ['[', ']']]
        }],
        
        ['rust', {
            id: 'rust',
            displayName: 'Rust',
            fileExtensions: ['.rs'],
            lineComment: '//',
            blockComment: { start: '/*', end: '*/' },
            testFramework: 'cargo test',
            importSyntax: 'use std::io;',
            functionSyntax: 'fn function() {}',
            completionPatterns: {
                'fn ': 'name() {}',
                'let ': 'variable = ',
                'let mut ': 'variable = ',
                'const ': 'NAME: type = ',
                'struct ': 'Name {}',
                'impl ': 'StructName {}',
                'trait ': 'TraitName {}',
                'enum ': 'Name {}',
                'use ': 'std::',
                'pub ': 'fn function() {}',
                'match ': 'value {',
                'if let ': 'Some(x) = ',
                'loop {': '\n    ',
                'while ': 'condition {',
                'for ': 'item in iter {',
                'return ': 'value;',
                'Some(': 'value)',
                'None': '',
                'Ok(': 'value)',
                'Err(': 'error)'
            } as Record<string, string>,
            keywords: ['fn', 'let', 'mut', 'const', 'struct', 'impl', 'trait', 'enum', 'use', 'pub', 'match'],
            bracePairs: [['(', ')'], ['{', '}'], ['[', ']'], ['<', '>']]
        }],
        
        ['ruby', {
            id: 'ruby',
            displayName: 'Ruby',
            fileExtensions: ['.rb'],
            lineComment: '#',
            blockComment: { start: '=begin', end: '=end' },
            testFramework: 'RSpec',
            importSyntax: "require 'module'",
            functionSyntax: 'def method_name; end',
            completionPatterns: {
                'puts ': '"text"',
                'print ': '"text"',
                'def ': 'method_name',
                'class ': 'ClassName',
                'module ': 'ModuleName',
                'if ': 'condition',
                'unless ': 'condition',
                'while ': 'condition',
                'for ': 'item in array',
                'do |': 'param|',
                'end': '',
                'require ': "'module'",
                'attr_accessor ': ':attribute',
                'attr_reader ': ':attribute',
                'attr_writer ': ':attribute'
            } as Record<string, string>,
            keywords: ['def', 'class', 'module', 'if', 'unless', 'while', 'for', 'do', 'end', 'require'],
            bracePairs: [['(', ')'], ['{', '}'], ['[', ']'], ['do', 'end']]
        }]
    ]);

    static getLanguageConfig(languageId: string): LanguageConfig | undefined {
        return this.languages.get(languageId) || this.languages.get('javascript');
    }

    static getAllLanguageIds(): string[] {
        return Array.from(this.languages.keys());
    }

    static getCompletionPatterns(languageId: string): Record<string, string> {
        const config = this.getLanguageConfig(languageId);
        return config?.completionPatterns || {};
    }

    static getTestFramework(languageId: string): string {
        const config = this.getLanguageConfig(languageId);
        return config?.testFramework || 'unit tests';
    }

    static generatePrompt(languageId: string, task: string, code: string, instruction: string): string {
        const config = this.getLanguageConfig(languageId);
        const langName = config?.displayName || 'code';
        
        switch (task) {
            case 'explain':
                return `Explain this ${langName} code clearly and concisely:\n\n\`\`\`${languageId}\n${code}\n\`\`\`\n\nExplanation:`;
            
            case 'refactor':
                return `Refactor this ${langName} code for better performance and readability:\n\n\`\`\`${languageId}\n${code}\n\`\`\`\n\nRefactored code:`;
            
            case 'test':
                return `Generate comprehensive unit tests for this ${langName} code using ${config?.testFramework}:\n\n\`\`\`${languageId}\n${code}\n\`\`\`\n\nUnit tests:`;
            
            case 'fix':
                return `Fix the error in this ${langName} code:\n\n\`\`\`${languageId}\n${code}\n\`\`\`\n\nFixed code:`;
            
            default:
                return `Analyze this ${langName} code:\n\n\`\`\`${languageId}\n${code}\n\`\`\``;
        }
    }

    static formatTestBoilerplate(languageId: string, tests: string): string {
        const config = this.getLanguageConfig(languageId);
        
        switch (languageId) {
            case 'javascript':
            case 'typescript':
                if (!tests.includes('describe') && !tests.includes('test')) {
                    return `// Tests using ${config?.testFramework}\nconst { expect } = require('chai');\n\n${tests}`;
                }
                break;
            
            case 'python':
                if (!tests.includes('import') && !tests.includes('def test_')) {
                    return `# Tests using ${config?.testFramework}\nimport pytest\n\n${tests}`;
                }
                break;
            
            case 'java':
                if (!tests.includes('import org.junit') && !tests.includes('@Test')) {
                    return `// Tests using ${config?.testFramework}\nimport org.junit.Test;\nimport static org.junit.Assert.*;\n\n${tests}`;
                }
                break;
            
            case 'csharp':
                if (!tests.includes('using NUnit') && !tests.includes('[Test]')) {
                    return `// Tests using ${config?.testFramework}\nusing NUnit.Framework;\n\n${tests}`;
                }
                break;
            
            case 'go':
                if (!tests.includes('testing') && !tests.includes('func Test')) {
                    return `// Tests using ${config?.testFramework}\npackage main\n\nimport "testing"\n\n${tests}`;
                }
                break;
        }
        
        return tests;
    }
}