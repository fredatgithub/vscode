/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { IObservable, observableFromEvent } from '../../../../base/common/observable.js';
import { URI } from '../../../../base/common/uri.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';

export interface IRecordableLogEntry {
	sourceId: string;
	time: number;
}

export interface IRecordableEditorLogEntry extends IRecordableLogEntry {
	modelUri: URI; // This has to be a URI, so that it gets translated automatically in remote scenarios
	modelVersion: number;
}

export type EditorLogEntryData = IDocumentEventDataSetChangeReason | IDocumentEventFetchStart;
export type LogEntryData = IEventFetchEnd;

export interface IDocumentEventDataSetChangeReason {
	sourceId: 'TextModel.setChangeReason';
	source: 'inlineSuggestion.accept' | 'snippet' | string;
}

interface IDocumentEventFetchStart {
	sourceId: 'InlineCompletions.fetch';
	kind: 'start';
	requestId: number;
}

export interface IEventFetchEnd {
	sourceId: 'InlineCompletions.fetch';
	kind: 'end';
	requestId: number;
	error: string | undefined;
	result: IFetchResult[];
}

interface IFetchResult {
	range: string;
	text: string;
	isInlineEdit: boolean;
	source: string;
}


/**
 * The sourceLabel must not contain '@'!
*/
export function formatRecordableLogEntry<T extends IRecordableLogEntry>(entry: T): string {
	return entry.sourceId + ' @@ ' + JSON.stringify({ ...entry, sourceId: undefined });
}

export class StructuredLogger<T extends IRecordableLogEntry> extends Disposable {
	public static cast<T extends IRecordableLogEntry>(): typeof StructuredLogger<T> {
		return this as typeof StructuredLogger<T>;
	}

	public readonly isEnabled;
	private readonly _contextKeyValue;

	constructor(
		private readonly _contextKey: string,
		@IContextKeyService private readonly _contextKeyService: IContextKeyService,
		@ICommandService private readonly _commandService: ICommandService
	) {
		super();
		this._contextKeyValue = observableContextKey<string>(this._contextKey, this._contextKeyService).recomputeInitiallyAndOnChange(this._store);
		this.isEnabled = this._contextKeyValue.map(v => v !== undefined);
	}

	public log(data: T): boolean {
		const commandId = this._contextKeyValue.get();
		if (!commandId) {
			return false;
		}
		try {
			this._commandService.executeCommand(commandId, data).catch(() => { });
		} catch (e) {
		}
		return true;
	}
}

function observableContextKey<T>(key: string, contextKeyService: IContextKeyService): IObservable<T | undefined> {
	return observableFromEvent(contextKeyService.onDidChangeContext, () => contextKeyService.getContextKeyValue<T>(key));
}
