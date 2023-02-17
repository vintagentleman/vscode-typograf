/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import * as vscode from 'vscode';
import Typograf from 'typograf';
import detect from 'franc';
import * as langs from 'langs';

import {supportedLocales} from './locales';

type SafeTags = Array<[string, string]>;
type RuleSettings = Record<string, Record<string, unknown>>;

export function activate(context: vscode.ExtensionContext) {
	const process = vscode.commands.registerCommand(
		'vscode-typograf.processSelected',
		async () => {
			const editor = vscode.window.activeTextEditor;

			if (!editor) {
				await vscode.window.showErrorMessage('No file opened.');
				return;
			}

			if (editor.selection.isEmpty) {
				await vscode.window.showErrorMessage('No text selected.');
				return;
			}

			const settings = vscode.workspace.getConfiguration('vscode-typograf');
			const text = editor.document.getText(editor.selection);

			let locale = settings.get('locale', 'en-US');
			let message = 'default ' + locale;

			if (settings.get('autoDetectLocale', true)) {
				const detected = detect(text);
				const localeSet = new Set(supportedLocales.map(locale => locale.label));

				if (detected !== 'und') {
					const l = langs.where('3', detected);

					if (l !== undefined) {
						locale = l['1'];

						if (locale === 'en' || !localeSet.has(locale)) {
							locale = 'en-US';
						}

						message = 'autodetected, ' + locale;
					}
				}
			}

			const t = new Typograf({
				locale,
				htmlEntity: {
					type: settings.get('type', 'default'),
					onlyInvisible: settings.get('onlyInvisible', false),
				},
				enableRule: prepareRules(settings.get('enableRules', [])),
				disableRule: prepareRules(settings.get('disableRules', [])),
			});

			const ruleSettings = settings.get('ruleSettings', {}) as RuleSettings;
			for (const [rule, settings] of Object.entries(ruleSettings)) {
				for (const [setting, value] of Object.entries(settings)) {
					t.setSetting(rule, setting, value);
				}
			}

			const safeTags = settings.get('safeTags', []) as SafeTags;
			for (const pair of safeTags) {
				t.addSafeTag(...pair);
			}

			const result = t.execute(text);
			await editor.edit(async builder => {
				builder.replace(editor.selection, (editor.selection.end.character === 0) ? result.concat('\n') : result);
			});
			await vscode.window.showInformationMessage(
				'Typograf completed, locale: ' + message,
			);
		},
	);

	const changeLocale = vscode.commands.registerCommand(
		'vscode-typograf.changeLocale',
		async () => {
			const locale = await vscode.window.showQuickPick(supportedLocales, {
				matchOnDescription: true,
			});

			if (locale === undefined) {
				return;
			}

			const settings = vscode.workspace.getConfiguration('vscode-typograf');
			await settings.update('locale', locale.label, true);
			return vscode.window.showInformationMessage(`Locale changed to ${locale.description}.`);
		},
	);

	context.subscriptions.push(process, changeLocale);
}

function prepareRules(rules: string[] | string) {
	const rulesAsArray = Array.isArray(rules) ? rules : rules.split(/[,;: ]/);
	return rulesAsArray.map(rule => rule.trim()).filter(Boolean);
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate() {}
