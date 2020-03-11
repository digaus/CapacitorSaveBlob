import { Injectable } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
    Capacitor,
    FileReadResult,
    FilesystemDirectory,
    FilesystemEncoding,
    GetUriResult,
    Plugins,
    ReaddirResult,
} from '@capacitor/core';
import { Platform } from '@ionic/angular';

const { Filesystem } = Plugins;

@Injectable({
    providedIn: 'root',
})
export class FileService {

    constructor(private myPlatform: Platform,
                private myDomSanitizer: DomSanitizer,
    ) {
    }

    public async initFolder(folderName: string): Promise<void> {
        await Filesystem.mkdir({
            path: folderName,
            directory: FilesystemDirectory.Data,
            recursive: false,
        }).catch((err: any) => { console.error(err); return null; });

    }
    public async writeFile(folder: string, fileName: string, blob: Blob, chunkSize: number): Promise<void> {
        await this.initFolder(folder);
        if (this.myPlatform.is('capacitor')) {
            await this.convertToBase64Chunks(blob, chunkSize, async (value: string, first: boolean): Promise<void> => {
                if (first) {
                    await Filesystem.writeFile({
                        path: folder + '/' + fileName,
                        directory: FilesystemDirectory.Data,
                        data: value,
                    });
                } else {
                    await Filesystem.appendFile({
                        path: folder + '/' + fileName,
                        directory: FilesystemDirectory.Data,
                        data: value,
                    });
                }
            });
        } else {
            await Filesystem.writeFile({
                path: folder + '/' + fileName,
                directory: FilesystemDirectory.Data,
                data: blob as any,
                encoding: FilesystemEncoding.UTF8,
            });
        }
    }

    public async readFile(folder: string, fileName: string): Promise<{success: SafeResourceUrl, revoke?: () => void}> {
        const directory: GetUriResult = await Filesystem.getUri({
            path: folder,
            directory: FilesystemDirectory.Data,
        }).catch((err: any) => { console.error(err); return null; });
        if (this.myPlatform.is('capacitor')) {
            const fileSrc: string = Capacitor.convertFileSrc(directory.uri + '/' + fileName);
            const safeUrl: SafeResourceUrl = this.myDomSanitizer.bypassSecurityTrustResourceUrl(fileSrc);
            return { success: safeUrl, revoke: (): void => {
                /** */
            }};
        } else {
            const blob: Blob = await this.readFileAsBlob(folder, fileName);
            const objectUrl: string = URL.createObjectURL(blob);
            const safeUrl: SafeResourceUrl = this.myDomSanitizer.bypassSecurityTrustResourceUrl(objectUrl);
            return { success: safeUrl, revoke: (): void => {
                URL.revokeObjectURL(objectUrl);
            }};
        }
    }

    public async readFileAsBlob(folder: string, fileName: string): Promise<Blob> {
        const directory: GetUriResult = await Filesystem.getUri({
            path: folder,
            directory: FilesystemDirectory.Data,
        }).catch((err: any) => { console.error(err); return null; });
        if (this.myPlatform.is('capacitor')) {
            const fileSrc: string = Capacitor.convertFileSrc(   directory.uri + '/' + fileName);
            const blob: Blob = await fetch(fileSrc).then((res: Response) => res.blob());
            return blob;
        } else {
            const result: FileReadResult = await Filesystem.readFile({
                path: folder + '/' + fileName,
                directory: FilesystemDirectory.Data,
            });
            const blob: Blob = result.data as any;
            return blob;
        }
    }


    private async convertToBase64Chunks(blob: Blob, size: number, chunk: (value: string, first?: boolean) => Promise<void>): Promise<void> {
        const chunkSize: number = 1024 * 1024 * size;
        if (size % 6) {
            throw {error: 'Chunksize must be a multiple of 6!'};
        } else {
            const blobSize: number = blob.size;
            while (blob.size > chunkSize) {
                const value: string = await this.convertToBase64(blob.slice(0, chunkSize));
                await chunk(blobSize === blob.size ? value : value.split(',')[1], blobSize === blob.size);
                blob = blob.slice(chunkSize);
            }
            const lastValue: string = await this.convertToBase64(blob.slice(0, blob.size));
            await chunk(lastValue.split(',')[1], blobSize === blob.size);
            blob = blob.slice(blob.size);
        }
    }

    private convertToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve: (base64: string) => void, reject: () => void): void =>  {
            let reader: FileReader = new FileReader();
            const realFileReader: FileReader = reader['_realReader'];
            if (realFileReader) {
                reader = realFileReader;
            }
            reader.onerror = (err: any): void => {
                console.log(err);
                reject();
            };
            reader.onload = (): void => {
                resolve(reader.result as string);
            };
            reader.readAsDataURL(blob);
        });
    }
}
