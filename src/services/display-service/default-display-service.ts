import { DisplayService } from "./display-service";
import { DisplayType } from "./display-type";
import * as $ from "jquery";
import { Observable, Observer } from "@nivinjoseph/n-util";


export class DefaultDisplayService implements DisplayService
{
    private readonly _windowResizeObserver = new Observer<void>("windowResized");
    private _currentDisplayType: DisplayType = null;
    private _currentDisplayWidth: number = null;
    private _currentDisplayHeight: number = null;


    public get currentDisplayType(): DisplayType { return this._currentDisplayType; }
    public get currentDisplayWidth(): number { return this._currentDisplayWidth; }
    public get currentDisplayHeight(): number { return this._currentDisplayHeight; }
    
    public get windowResizeObservable(): Observable<void> { return this._windowResizeObserver; }
    


    constructor()
    {
        this._calculateCurrentDisplayType();
        $(window).on("resize", () =>
        {
            this._calculateCurrentDisplayType();
            this._windowResizeObserver.notify();
        });
    }


    private _calculateCurrentDisplayType(): void
    {
        const displayHeight = $(window).height();
        if (this._currentDisplayHeight !== displayHeight)
            this._currentDisplayHeight = displayHeight;   
        
        const displayWidth = $(window).width();
        if (displayWidth === this._currentDisplayWidth)
            return;
        this._currentDisplayWidth = displayWidth;

        let displayType = DisplayType.desktop;
        if (displayWidth < 1024) displayType = DisplayType.tablet;
        if (displayWidth < 769) displayType = DisplayType.phone;
        this._currentDisplayType = displayType;
    }
}