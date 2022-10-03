/* eslint-disable @typescript-eslint/no-unsafe-call */
import "@nivinjoseph/n-ext";
import * as Sharp from "sharp";
const loaderUtils = require("loader-utils");
import * as Path from "path";
import { TypeHelper } from "@nivinjoseph/n-util";
const imagemin = require("imagemin");
import { given } from "@nivinjoseph/n-defensive";


interface ResizedImage
{
    // name: string;
    ext: string;
    width: number;
    height: number;
    size: number;
    data: Buffer;
}

function resize(data: Buffer, width: number, height: number, format: string | null, quality: number, background: string): Promise<ResizedImage>
{
    given(format, "format").ensureIsString()
        .ensure(t => ["jpeg", "webp"].contains(t), "invalid format [must be jpeg or webp]");
    
    const promise = new Promise<ResizedImage>((resolve, reject) =>
    {
        let s = Sharp(data);
        if (width || height)
            s = s.resize(width, height);

        if (format === "jpeg")
        {
            // console.log("IN RESIZE", background);
            if (background)
            {
                background = background.toString().trim();
                if (background.length === 6 || background.length === 3)
                {
                    s = s.flatten({
                        background: "#" + background
                    });
                    
                    // console.log("backgrounding", background);
                }
                else
                {
                    console.warn("SUPPLIED BACKGROUND PARAMETER IS NOT A VALID HEX COLOR.");
                }
            }
            s = s.jpeg({ quality: quality });
        }
        else if (format === "webp")
        {
            s = s.webp({ quality: quality });
        }

        s.toBuffer((err: any, buf: any, info: any) =>
        {
            if (err)
                reject(err);
            else
                resolve({
                    // name: fileName.endsWith(info.format) ? fileName : fileName + "." + info.format,
                    ext: info.format.toLowerCase(),
                    width: info.width,
                    height: info.height,
                    size: info.size,
                    data: buf
                });
        });
    });

    // We could optionally optimize the image here using
    // https://github.com/imagemin/imagemin

    return promise;
}

// function normalizePath(path: any, stripTrailing: any): any
// {
//     if (path === "\\" || path === "/")
//     {
//         return "/";
//     }

//     const len = path.length;

//     if (len <= 1)
//     {
//         return path;
//     }

//     // ensure that win32 namespaces has two leading slashes, so that the path is
//     // handled properly by the win32 version of path.parse() after being normalized
//     // https://msdn.microsoft.com/library/windows/desktop/aa365247(v=vs.85).aspx#namespaces
//     let prefix = "";

//     if (len > 4 && path[3] === "\\")
//     {
//         // eslint-disable-next-line prefer-destructuring
//         const ch = path[2];

//         if ((ch === "?" || ch === ".") && path.slice(0, 2) === "\\\\")
//         {
//             // eslint-disable-next-line no-param-reassign
//             path = path.slice(2);
//             prefix = "//";
//         }
//     }

//     const segs = path.split(/[/\\]+/);

//     if (stripTrailing !== false && segs[segs.length - 1] === "")
//     {
//         segs.pop();
//     }

//     return prefix + segs.join("/");
// }

module.exports = function (content: any): void
{
    // @ts-expect-error: unsafe use of this
    if (this.cacheable)
        // @ts-expect-error: unsafe use of this
        this.cacheable();
    
    const MIMES: { [index: string]: string; } = {
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "png": "image/png",
        "gif": "image/gif",
        "webp": "image/webp",
        "svg": "image/svg+xml"
    };

    // @ts-expect-error: unsafe use of this
    const ext = Path.extname(this.resourcePath).replace(/\./, "").toLowerCase();
    if (!MIMES[ext])
        // @ts-expect-error: unsafe use of this
        throw new Error(`Unsupported format for file '${this.resourcePath}'`);

    // @ts-expect-error: unsafe use of this
    const parsedResourceQuery = this.resourceQuery ? loaderUtils.parseQuery(this.resourceQuery) : {};
    Object.keys(parsedResourceQuery)
        .filter(t => ["width", "height"].contains(t))
        .forEach(t => parsedResourceQuery[t] = TypeHelper.parseNumber(parsedResourceQuery[t]));

    const { width, height, format, background } = parsedResourceQuery;
    // console.log(parsedResourceQuery);
    
    // @ts-expect-error: unsafe use of this
    const callback = this.async();
    
    if(ext === "svg" && format == null)
    {
        callback(null, content);
        return;
    }

    const options = loaderUtils.getOptions(this) || {};
    // const context = options.context || this.rootContext;

    // const limit = options.urlEncodeLimit;
    const jpegQuality = options.jpegQuality || 75;
    const pngQuality = Number.parseFloat(((options.pngQuality || 75) / 100).toFixed(1));
    const webpQuality = options.webpQuality || 75;
    // console.log("LIMIT", limit);


    const plugins = [
        require("imagemin-gifsicle")({}),
        require("imagemin-mozjpeg")({ quality: jpegQuality }),
        require("imagemin-svgo")({}),
        require("imagemin-pngquant")({ quality: [pngQuality, pngQuality] }),
        // require("imagemin-optipng")({}),
        require("imagemin-webp")({ quality: webpQuality })
    ];
    
    // const isFormatted = ext === "svg" || format === "jpeg";
    
    resize(content, width, height, format?.trim(), jpegQuality, background)
        .then(resized =>
        {
            // console.log(this.resourcePath, " ==> ", resized.ext);
            
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return imagemin.buffer(resized.data, { plugins });
        })
        .then(data =>
        {
            // callback(null, data);
            
            if (format != null)
            {
                // @ts-expect-error: unsafe use of this
                this.resourcePath = this.resourcePath.replace(new RegExp(`.${ext}`, "i"), "." + format);
                
                // const context = options.context || this.rootContext;
                // const name = `[name]_${ext}.jpeg`;
                // const name = `[name].[ext]`;
                // const url = loaderUtils.interpolateName(this, name, {
                //     context,
                //     content: data
                // });

                // const outputPath = url;
                // let publicPath = `__webpack_public_path__ + ${JSON.stringify(outputPath)}`;
                // if (options.publicPath)
                // {
                //     if (typeof options.publicPath === "function")
                //     {
                //         publicPath = options.publicPath(url, this.resourcePath, context);
                //     } else
                //     {
                //         publicPath = `${options.publicPath.endsWith("/")
                //                 ? options.publicPath
                //                 : `${options.publicPath}/`
                //             }${url}`;
                //     }

                //     publicPath = JSON.stringify(publicPath);
                // }
                // const assetInfo: any = {
                //     // sourceFilename: normalizePath(Path.relative(this.rootContext, this.resourcePath), undefined)
                //     sourceFilename: normalizePath(Path.relative(this.rootContext, this.resourcePath), undefined)
                // };
                
                // this.emitFile(outputPath, data, null, assetInfo);
                // callback(null, `module.exports = ${publicPath}`);
                callback(null, data);
            }
            else
                callback(null, data);
            
            
        })
        .catch(e =>
        {
            callback(e);
        });
};

module.exports.raw = true;