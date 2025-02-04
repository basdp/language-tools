export * from '@volar/language-service';
export * from '@vue/language-core';
export * from './lib/ideFeatures/nameCasing';
export * from './lib/types';

import type { ServiceContext, ServiceEnvironment, LanguageServicePlugin } from '@volar/language-service';
import type { VueCompilerOptions } from './lib/types';

import { create as createEmmetPlugin } from 'volar-service-emmet';
import { create as createJsonPlugin } from 'volar-service-json';
import { create as createPugFormatPlugin } from 'volar-service-pug-beautify';
import { create as createTypeScriptPlugins } from 'volar-service-typescript';
import { create as createTypeScriptTwoslashQueriesPlugin } from 'volar-service-typescript-twoslash-queries';
import { create as createTypeScriptDocCommentTemplatePlugin } from 'volar-service-typescript/lib/plugins/docCommentTemplate';
import { create as createTypeScriptSyntacticPlugin } from 'volar-service-typescript/lib/plugins/syntactic';
import { create as createCssPlugin } from './lib/plugins/css';
import { create as createVueAutoDotValuePlugin } from './lib/plugins/vue-autoinsert-dotvalue';
import { create as createVueAutoWrapParenthesesPlugin } from './lib/plugins/vue-autoinsert-parentheses';
import { create as createVueAutoAddSpacePlugin } from './lib/plugins/vue-autoinsert-space';
import { create as createVueReferencesCodeLensPlugin } from './lib/plugins/vue-codelens-references';
import { create as createVueDirectiveCommentsPlugin } from './lib/plugins/vue-directive-comments';
import { create as createVueDocumentDropPlugin } from './lib/plugins/vue-document-drop';
import { create as createVueExtractFilePlugin } from './lib/plugins/vue-extract-file';
import { create as createVueSfcPlugin } from './lib/plugins/vue-sfc';
import { create as createVueTemplatePlugin } from './lib/plugins/vue-template';
import { create as createVueToggleVBindPlugin } from './lib/plugins/vue-toggle-v-bind-codeaction';
import { create as createVueTwoslashQueriesPlugin } from './lib/plugins/vue-twoslash-queries';
import { create as createVueVisualizeHiddenCallbackParamPlugin } from './lib/plugins/vue-visualize-hidden-callback-param';

import { decorateLanguageServiceForVue } from '@vue/typescript-plugin/lib/common';
import { collectExtractProps } from '@vue/typescript-plugin/lib/requests/collectExtractProps';
import { getComponentEvents, getComponentNames, getComponentProps, getElementAttrs, getTemplateContextProps } from '@vue/typescript-plugin/lib/requests/componentInfos';
import { getPropertiesAtLocation } from '@vue/typescript-plugin/lib/requests/getPropertiesAtLocation';
import { getQuickInfoAtPosition } from '@vue/typescript-plugin/lib/requests/getQuickInfoAtPosition';

export function createVueServicePlugins(
	ts: typeof import('typescript'),
	getVueOptions: (env: ServiceEnvironment) => VueCompilerOptions,
	getTsPluginClient = createDefaultGetTsPluginClient(ts, getVueOptions),
	hybridMode = false,
): LanguageServicePlugin[] {
	const plugins: LanguageServicePlugin[] = [];
	if (!hybridMode) {
		plugins.push(...createTypeScriptPlugins(ts));
		for (let i = 0; i < plugins.length; i++) {
			const plugin = plugins[i];
			if (plugin.name === 'typescript-semantic') {
				plugins[i] = {
					...plugin,
					create(context) {
						const created = plugin.create(context);
						if (!context.language.typescript) {
							return created;
						}
						const languageService = (created.provide as import('volar-service-typescript').Provide)['typescript/languageService']();
						const vueOptions = getVueOptions(context.env);
						decorateLanguageServiceForVue(context.language, languageService, vueOptions, ts, false);
						return created;
					},
				};
				break;
			}
		}
	}
	else {
		plugins.push(
			createTypeScriptSyntacticPlugin(ts),
			createTypeScriptDocCommentTemplatePlugin(ts),
		);
	}
	plugins.push(
		createTypeScriptTwoslashQueriesPlugin(ts),
		createCssPlugin(),
		createPugFormatPlugin(),
		createJsonPlugin(),
		createVueTemplatePlugin('html', ts, getVueOptions, getTsPluginClient),
		createVueTemplatePlugin('pug', ts, getVueOptions, getTsPluginClient),
		createVueSfcPlugin(),
		createVueTwoslashQueriesPlugin(ts, getTsPluginClient),
		createVueReferencesCodeLensPlugin(),
		createVueDocumentDropPlugin(ts),
		createVueAutoDotValuePlugin(ts, getTsPluginClient),
		createVueAutoWrapParenthesesPlugin(ts),
		createVueAutoAddSpacePlugin(),
		createVueVisualizeHiddenCallbackParamPlugin(),
		createVueDirectiveCommentsPlugin(),
		createVueExtractFilePlugin(ts, getTsPluginClient),
		createVueToggleVBindPlugin(ts),
		createEmmetPlugin(),
	);
	return plugins;
}

export function createDefaultGetTsPluginClient(
	ts: typeof import('typescript'),
	getVueOptions: (env: ServiceEnvironment) => VueCompilerOptions,
): (context: ServiceContext) => typeof import('@vue/typescript-plugin/lib/client') | undefined {
	return context => {
		if (!context.language.typescript) {
			return;
		}
		const requestContext = {
			typescript: ts,
			language: context.language,
			languageService: context.inject<(import('volar-service-typescript').Provide), 'typescript/languageService'>('typescript/languageService'),
			vueOptions: getVueOptions(context.env),
			isTsPlugin: false,
			getFileId: context.env.typescript!.fileNameToUri,
		};
		return {
			async collectExtractProps(...args) {
				return await collectExtractProps.apply(requestContext, args);
			},
			async getPropertiesAtLocation(...args) {
				return await getPropertiesAtLocation.apply(requestContext, args);
			},
			async getComponentEvents(...args) {
				return await getComponentEvents.apply(requestContext, args);
			},
			async getComponentNames(...args) {
				return await getComponentNames.apply(requestContext, args);
			},
			async getComponentProps(...args) {
				return await getComponentProps.apply(requestContext, args);
			},
			async getElementAttrs(...args) {
				return await getElementAttrs.apply(requestContext, args);
			},
			async getTemplateContextProps(...args) {
				return await getTemplateContextProps.apply(requestContext, args);
			},
			async getQuickInfoAtPosition(...args) {
				return await getQuickInfoAtPosition.apply(requestContext, args);
			},
		};
	};;
}
