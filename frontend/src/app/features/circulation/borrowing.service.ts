import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, switchMap, tap } from 'rxjs';
export type BorrowRequestStatus='PENDING'|'APPROVED'|'REJECTED'|'ISSUED';export type LoanStatus='ACTIVE'|'RETURNED'|'LOST';export type ReturnCondition='GOOD'|'DAMAGED'|'LOST';
export interface Page<T>{content:T[];page:number;size:number;totalElements:number;totalPages:number}
export interface RequestEvent{eventType:string;actorEmail:string;occurredAt:string;reason:string|null}
export interface BorrowRequestRecord{id:string;bookId:string;bookTitle:string;coverImageUrl:string|null;borrowerEmail:string;status:BorrowRequestStatus;submittedAt:string;decidedAt:string|null;decisionReason:string|null;history:RequestEvent[]}
export interface LoanEvent{eventType:string;actorEmail:string;occurredAt:string;effectiveDate:string;previousDueDate:string|null;newDueDate:string|null;copyStatus:string|null;note:string|null}
export interface LoanRecord{id:string;borrowRequestId:string;bookId:string;bookTitle:string;coverImageUrl:string|null;copyIdentifier:string;borrowerEmail:string;status:LoanStatus;issueDate:string;dueDate:string;actualReturnDate:string|null;renewalCount:number;overdue:boolean;renewalEligible:boolean;returnNote:string|null;history:LoanEvent[]}
export interface Holiday{id:string;holidayDate:string;name:string;createdByEmail:string;createdAt:string}
export interface CirculationCopy{id:string;bookId:string;copyIdentifier:string;location:string|null;status:string}
@Injectable({providedIn:'root'}) export class BorrowingService{
 private readonly http=inject(HttpClient);
 private csrf():Observable<HttpHeaders>{return this.http.get<{headerName:string;token:string}>('/api/v1/auth/csrf').pipe(tap(x=>{if(!x.headerName||!x.token)throw new Error('Security token unavailable')}),switchMap(x=>[new HttpHeaders().set(x.headerName,x.token)]))}
 private post<T>(path:string,body:unknown):Observable<T>{return this.csrf().pipe(switchMap(headers=>this.http.post<T>(path,body,{headers})))}private delete(path:string):Observable<void>{return this.csrf().pipe(switchMap(headers=>this.http.delete<void>(path,{headers})))}
 myRequests(page=0):Observable<Page<BorrowRequestRecord>>{return this.http.get<Page<BorrowRequestRecord>>('/api/v1/borrow-requests/mine',{params:new HttpParams().set('page',page).set('size',20)})}
 queue(status=''):Observable<Page<BorrowRequestRecord>>{let params=new HttpParams().set('size',100);if(status)params=params.set('status',status);return this.http.get<Page<BorrowRequestRecord>>('/api/v1/borrow-requests',{params})}
 submit(bookId:string):Observable<BorrowRequestRecord>{return this.post('/api/v1/borrow-requests',{bookId})}decide(id:string,decision:'APPROVE'|'REJECT',reason:string|null):Observable<BorrowRequestRecord>{return this.post(`/api/v1/borrow-requests/${id}/decision`,{decision,reason})}issue(id:string,copyId:string,note:string|null=null):Observable<LoanRecord>{return this.post(`/api/v1/borrow-requests/${id}/issue`,{copyId,note})}
 currentLoans():Observable<Page<LoanRecord>>{return this.http.get<Page<LoanRecord>>('/api/v1/loans/mine')}loanHistory():Observable<Page<LoanRecord>>{return this.http.get<Page<LoanRecord>>('/api/v1/loans/mine/history')}librarianLoans(overdueOnly=false):Observable<Page<LoanRecord>>{return this.http.get<Page<LoanRecord>>('/api/v1/loans',{params:new HttpParams().set('status','ACTIVE').set('overdueOnly',overdueOnly)})}
 renew(id:string):Observable<LoanRecord>{return this.post(`/api/v1/loans/${id}/renew`,{})}returnLoan(id:string,condition:ReturnCondition,note:string|null):Observable<LoanRecord>{return this.post(`/api/v1/loans/${id}/return`,{condition,note})}
 holidays():Observable<Holiday[]>{return this.http.get<Holiday[]>('/api/v1/holidays')}addHoliday(date:string,name:string):Observable<Holiday>{return this.post('/api/v1/holidays',{holidayDate:date,name})}deleteHoliday(id:string):Observable<void>{return this.delete(`/api/v1/holidays/${id}`)}
}
