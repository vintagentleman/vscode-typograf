/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import * as vscode from 'vscode';
import Typograf from 'typograf';
import detect from 'franc';
import * as langs from 'langs';

const supportedLocales = new Set([
	'be',
	'bg',
	'ca',
	'cs',
	'da',
	'de',
	'el',
	'en-GB',
	'en-US',
	'eo',
	'es',
	'et',
	'fi',
	'fr',
	'ga',
	'hu',
	'it',
	'lv',
	'nl',
	'no',
	'pl',
	'ro',
	'ru',
	'sk',
	'sl',
	'sr',
	'sv',
	'tr',
	'uk',
]);

export function activate(context: vscode.ExtensionContext) {
	const process = vscode.commands.registerCommand(
		'vscode-typograf.processSelected',
		async () => {
			const editor = vscode.window.activeTextEditor;

			if (!editor) {
				return;
			}

			const settings = vscode.workspace.getConfiguration('vscode-typograf');
			const text = editor.document.getText(editor.selection);

			let locale = settings.get('locale', 'en-US');
			let message = 'default ' + locale;

			if (settings.get('autoDetectLocale', true)) {
				const detected = detect(text);

				if (detected !== 'und') {
					const l = langs.where('3', detected);

					if (l !== undefined) {
						locale = l['1'];

						if (locale === 'en' || !supportedLocales.has(locale)) {
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

			const result = t.execute(text);

			await editor.edit(async builder => {
				builder.replace(editor.selection, result);
				await vscode.window.showInformationMessage(
					'Typograf completed, locale: ' + message,
				);
			});
		},
	);

	context.subscriptions.push(process);
}

function prepareRules(rules: string[] | string) {
	const rulesAsArray = Array.isArray(rules) ? rules : rules.split(/[,;: ]/);
	return rulesAsArray.map(rule => rule.trim()).filter(Boolean);
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
export function deactivate() {}
