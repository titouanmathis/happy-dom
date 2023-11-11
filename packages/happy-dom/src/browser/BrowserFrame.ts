import BrowserPage from './BrowserPage.js';
import AsyncTaskManager from '../async-task-manager/AsyncTaskManager.js';
import IBrowserFrame from './types/IBrowserFrame.js';
import Window from '../window/Window.js';
import Location from '../location/Location.js';
import IResponse from '../fetch/types/IResponse.js';
import BrowserFrameUtility from './BrowserFrameUtility.js';
import IGoToOptions from './types/IGoToOptions.js';
import { Script } from 'vm';

/**
 * Browser frame.
 */
export default class BrowserFrame implements IBrowserFrame {
	public readonly childFrames: BrowserFrame[] = [];
	public readonly parentFrame: BrowserFrame | null = null;
	public readonly page: BrowserPage;
	public readonly window: Window;
	public _asyncTaskManager = new AsyncTaskManager();

	/**
	 * Constructor.
	 *
	 * @param page Page.
	 */
	constructor(page: BrowserPage) {
		this.page = page;
		this.window = new Window({
			browserFrame: this,
			console: page.console
		});
	}

	/**
	 * Returns the content.
	 *
	 * @returns Content.
	 */
	public get content(): string {
		return this.window.document.documentElement.outerHTML;
	}

	/**
	 * Sets the content.
	 *
	 * @param content Content.
	 */
	public set content(content) {
		this.window.document['_isFirstWrite'] = true;
		this.window.document['_isFirstWriteAfterOpen'] = false;
		this.window.document.open();
		this.window.document.write(content);
	}

	/**
	 * Returns the URL.
	 *
	 * @returns URL.
	 */
	public get url(): string {
		return this.window.location.href;
	}

	/**
	 * Sets the content.
	 *
	 * @param url URL.
	 */
	public set url(url) {
		(<Location>this.window.location) = new Location(
			this,
			BrowserFrameUtility.getRelativeURL(this, url)
		);
	}

	/**
	 * Returns a promise that is resolved when all async tasks are complete.
	 *
	 * @returns Promise.
	 */
	public async whenComplete(): Promise<void> {
		await Promise.all([
			this._asyncTaskManager.whenComplete(),
			...this.childFrames.map((frame) => frame.whenComplete())
		]);
	}

	/**
	 * Aborts all ongoing operations.
	 *
	 * @returns Promise.
	 */
	public abort(): void {
		for (const frame of this.childFrames) {
			frame.abort();
		}
		this._asyncTaskManager.abortAll();
	}

	/**
	 * Evaluates code or a VM Script in the page's context.
	 *
	 * @param script Script.
	 * @returns Result.
	 */
	public evaluate(script: string | Script): any {
		return BrowserFrameUtility.evaluate(this, script);
	}

	/**
	 * Go to a page.
	 *
	 * @param url URL.
	 * @param [options] Options.
	 */
	public async goto(url: string, options?: IGoToOptions): Promise<IResponse | null> {
		return await BrowserFrameUtility.goto(Window, this, url, options);
	}
}
