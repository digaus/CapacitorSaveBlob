import { HttpClient, HttpErrorResponse, HttpEvent, HttpEventType } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { LoadingController } from '@ionic/angular';

import { FileService } from '../services/file.service';

@Component({
  selector: 'app-folder',
  templateUrl: './folder.page.html',
  styleUrls: ['./folder.page.scss'],
})
export class FolderPage implements OnInit {
  public folder: string;
  public src: SafeResourceUrl;

  constructor(private activatedRoute: ActivatedRoute,
              private fileService: FileService,
              private httpClient: HttpClient,
              private loadingController: LoadingController,
  ) { }

  public async ngOnInit(): Promise<void> {
    this.folder = this.activatedRoute.snapshot.paramMap.get('id');
    // Loading from assets because I have no server which allows CORS
    const blob: Blob = await this.downloadFile('assets/star_trails.mp4');
    const loading: HTMLIonLoadingElement = await this.loadingController.create({
      message: 'Saving file...',
      showBackdrop: false,
    });

    await loading.present();
    console.time('WriteFile');
    await this.fileService.writeFile('video', 'sample.mp4', blob, 6);
    console.timeEnd('WriteFile');

    loading.message = 'Reading file...',

    console.time('LoadFile');
    this.src = (await this.fileService.readFile('video', 'sample.mp4')).success;
    console.timeEnd('LoadFile');
    loading.dismiss();
  }


  private downloadFile(url: string): Promise<Blob> {
    return new Promise(async (resolve: (blob: Blob) => void, reject: (err: HttpErrorResponse) => void ) => {
      const loading: HTMLIonLoadingElement = await this.loadingController.create({
        message: 'Downloading...',
          showBackdrop: false,
      });
      await loading.present();
      this.httpClient.get(url, {responseType: 'blob', reportProgress: true, observe: 'events'})
          .subscribe(async (event: HttpEvent<Blob>) => {
              if (event.type === HttpEventType.DownloadProgress) {
                  loading.message = (event.loaded / 1000).toFixed()  + ' / ' + (event.total / 1000).toFixed() +
                                    ' KB (' + (event.loaded / event.total * 100).toFixed() + '%)';
              } else if (event.type === HttpEventType.Response) {
                loading.dismiss();
                resolve(event.body);
              }
          }, (err: HttpErrorResponse) => {
            loading.dismiss();
            reject(err);
          });
    });
  }
}
