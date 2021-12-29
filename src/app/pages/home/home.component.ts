import { Component, OnInit } from '@angular/core';
import {combineLatest, Observable} from "rxjs";
import { FormBuilder } from "@angular/forms";
import {debounceTime, distinctUntilChanged, filter, map, mergeMap, switchMap, tap} from "rxjs/operators";
import { HttpClient, HttpHeaders } from "@angular/common/http";

interface Property {
  propertyId?: string;
  propertyOverview: {
    code?: string;
    name?: string;
  }
}

interface Unit {
  unitId?: string;
  unitNumber?: string;
}

interface FreeType {
  id: string;
  label: string;
  kind: string;
  data?: Record<string, any>
}

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  public data$!: Observable<FreeType[]>;
  public data: FreeType[] = [{ id: 'test', label: 'TEST', kind: 'property' }];
  public showState: boolean = false;
  public loadingState: boolean = false;
  public searchForm = this.fb.group(
    {
      search: '',
      token: 'eyJraWQiOiJHOXFtWnRfWG1GTTJtY0RubkVTYjF1Y3RSWDF2VnRnSUJCTllXdmM4ZFowIiwiYWxnIjoiUlMyNTYifQ.eyJ2ZXIiOjEsImp0aSI6IkFULklDQTloRURpY3dLbENHRVhlU1JzdFNlTUZRVWxHeGhVR2M5RnNVSDZqWXMiLCJpc3MiOiJodHRwczovL2lpbXNzbmMub2t0YXByZXZpZXcuY29tL29hdXRoMi9kZWZhdWx0IiwiYXVkIjoiYXBpOi8vZGVmYXVsdCIsImlhdCI6MTY0MDc2NzY1NSwiZXhwIjoxNjQwODU0MDU1LCJjaWQiOiIwb2FoOXJtY2xwcE13VUFKVjBoNyIsInVpZCI6IjAwdTEwcWV1OThzYlU0QXB1MGg4Iiwic2NwIjpbIkFsb2hhIl0sInN1YiI6ImNob3Rpa2Fybi5ydW5ndmlib29uQHNzY2luYy5jb20iLCJHcm91cHNPbkFjY2Vzc1Rva2VuIjpbIlNTTkMtQWxsVXNlcnMiLCJFdmVyeW9uZSJdLCJvcmdhbml6YXRpb24iOiJTU05DIn0.NwpFbloRZ-c4Db3tyL_d1UcTBikMN7tGWrbnZyB2J-BWgclHFPgnX2n59rX0QopubgaSHjsLo-f_u4YD69aZ2-n3jXIYsXx86NiGslz3YwwCGkw3UGfnCQHlcnfjh9tnA-IN0L5Nw6RXDvJ3IOFjCwZn0kKkm7O4kPqdc7qqtOaKkRSWRzUwbX1IzekKRne4yj6YFm8916fAf83j4_U0eEDKEQmXiodtBzBKfd5q65E1aSMeh9HRNDIPfQ2yoVZKqtXlW7vIUnGytuVCFXfLmLGy07iFm0Y3yWLNl4y572xxLnvH8-P5ul6oIIfgYNlOZlerhwbvXLYlolPs4S8YSA'
    }
  );
  private object: Record<string, string> = {}

  constructor(
    private readonly fb: FormBuilder,
    private readonly http: HttpClient,
  ) { }

  ngOnInit(): void {
    this.object.test = 'test';
    const control = this.searchForm.get('search');
    if (control) {
      this.data$ =  control.valueChanges
        .pipe(
          distinctUntilChanged(),
          tap((value) => {
            if (!value || value.length <= 2) {
              this.data = [];
              this.showState = false;
            }
          }),
          filter((value) => !!value && value.length > 2), // TODO: convert to iif operator.
          debounceTime(100),
          tap(() => {
            this.loadingState = true;
          }),
          switchMap(() => this.fetch()),
          map(({ data }: any) => {
            this.loadingState = false;
            const { properties, units } = data;
            const propertiesWithKind = <Property[]>properties
              .map((item: Property) => ({ id: item.propertyId, kind: 'property', label: item.propertyOverview.name, data: item }));
            const unitsWithKind = <Unit[]>units
              .map((item: Unit) => ({ id: item.unitId, kind: 'unit', label: item.unitNumber, data: item }));
            this.data = [...propertiesWithKind, ...unitsWithKind] as FreeType[];
            console.log(this.data);
            this.showState = !!this.data.length;
            return [...propertiesWithKind, ...unitsWithKind] as FreeType[];
          })
        )
    }
  }

  /**
   * Handle fetch data from graph.
   */
  fetch() {
    const formValue = this.searchForm.value;
    const { token, search } = formValue;
    const body = this.gqlBuild(search);
    const headers = this.headerBuild(token);
    return this.http.post('http://localhost:3019/graphql', { ...body }, { headers });
  }

  /**
   * Build header for post request.
   * @param token
   */
  headerBuild(token: string) {
    let headers = new HttpHeaders();
    headers = headers.set('Content-Type', 'application/json; charset=utf-8');
    headers = headers.set('Authorization', `Bearer ${token}`);
    headers = headers.set('organization', 'SSNC');
    return headers;
  }

  /**
   * Build gql query.
   * @param search
   */
  gqlBuild(search: string) {
    const operationName = 'search';
    const query = `query search($propertySearch: String, $unitSearch: String) {
      properties(search: $propertySearch) {
        propertyId
        propertyOverview {
          code
          name
        }
      }
      units(search: $unitSearch) {
        unitId
        unitNumber
        propertyId
      }
    }`;
    const variables = {
      propertySearch: search,
      unitSearch: search
    }
    return {operationName, query, variables};
  }

  itemSelect(event: FreeType) {
    this.showState = false;
  }

}
