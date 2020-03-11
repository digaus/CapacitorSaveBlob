import { HttpClient, HttpEvent, HttpEventType, HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { LoadingController } from '@ionic/angular';

import { FileService } from '../services/file.service';
import { Filesystem, FilesystemDirectory } from '@capacitor/core';

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
    const blob: Blob = await this.downloadFile('http://clips.vorwaerts-gmbh.de/big_buck_bunny.mp4');
    const loading: HTMLIonLoadingElement = await this.loadingController.create({
      message: 'Saving file...',
      showBackdrop: false,
    });
    await this.fileService.writeFile('video', 'sample.mp4', blob, 3);
    loading.message = 'Reading file...',
    this.src = await this.fileService.readFile('video', 'sample.mp4');
    loading.dismiss();
  }


  private downloadFile(url: string): Promise<Blob> {
    return new Promise(async (resolve: (blob: Blob) => void, reject: (err: HttpErrorResponse) => void ) => {
      const loading: HTMLIonLoadingElement = await this.loadingController.create({
        message: 'Downloading file: ...',
          showBackdrop: false,
      });
      await loading.present();
      this.httpClient.get(url, {responseType: 'blob', reportProgress: true, observe: 'events'})
          .subscribe(async (event: HttpEvent<Blob>) => {
              if (event.type === HttpEventType.DownloadProgress) {
                  loading.message = 'Downloading file: ' + (event.loaded / 1000).toFixed()  + ' / ' + (event.total / 1000).toFixed() +
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
