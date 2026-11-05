import {
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import {
  BookDetail,
  CatalogueService,
  ChapterSearchMatch,
  ChapterSearchResponse,
  DigitalEdition
} from './catalogue.service';

@Component({
  selector: 'app-pdf-reader',
  standalone: true,
  imports: [RouterLink, CommonModule],
  template: `
    <div class="reader-shell" [class.immersive-active]="isImmersive()">
      <!-- Compact Premium Reader Toolbar (Height: 46px) -->
      <header class="reader-toolbar" role="toolbar" aria-label="PDF Reader Toolbar">
        <!-- LEFT: Navigation & Book Details -->
        <div class="toolbar-left">
          <a
            class="button button-secondary back-button"
            [routerLink]="backLink()"
            [queryParams]="savedQueryParams()"
            aria-label="Back to book details"
            title="Return to book details"
          >
            <span class="btn-icon" aria-hidden="true">
              <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
                <path fill-rule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clip-rule="evenodd" />
              </svg>
            </span>
            <span class="back-text">Back to book</span>
          </a>

          @if (book(); as b) {
            <div class="book-meta" [title]="b.title + ' — ' + b.authors.join(', ')">
              <h1 class="book-title">{{ b.title }}</h1>
              <span class="meta-separator" aria-hidden="true">·</span>
              <span class="book-author">{{ b.authors.join(', ') }}</span>
            </div>
          }
        </div>

        <!-- CENTER: Page Navigation & Zoom / View Fit Controls -->
        <div class="toolbar-center">
          <!-- Page Navigation Group -->
          <div class="page-indicator-pill" role="group" aria-label="Page navigation controls">
            <button
              type="button"
              class="tool-btn page-nav-arrow"
              [disabled]="currentPage() <= 1"
              (click)="stepPage(-1)"
              aria-label="Previous page"
              title="Previous page (Left Arrow)"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                <path fill-rule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clip-rule="evenodd" />
              </svg>
            </button>

            <span class="page-label sr-only">Page</span>
            <input
              type="number"
              class="page-input"
              [value]="currentPage()"
              min="1"
              [max]="totalPages() || 9999"
              (change)="onPageChange($any($event.target).value)"
              (keydown.enter)="onPageChange($any($event.target).value)"
              aria-label="Current page number"
              title="Enter page number"
            />

            @if (totalPages(); as total) {
              <span class="page-text">of {{ total }}</span>
            }

            <button
              type="button"
              class="tool-btn page-nav-arrow"
              [disabled]="totalPages() != null && currentPage() >= (totalPages() || 1)"
              (click)="stepPage(1)"
              aria-label="Next page"
              title="Next page (Right Arrow)"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                <path fill-rule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clip-rule="evenodd" />
              </svg>
            </button>

            @if (targetPage(); as tp) {
              <span class="selected-page-tag" title="Target page">Navigated: p. {{ tp }}</span>
            }
          </div>

          <div class="toolbar-divider" aria-hidden="true"></div>

          <!-- Zoom & Fit Controls Group -->
          <div class="zoom-controls-group" role="group" aria-label="Zoom and View Controls">
            <button
              type="button"
              class="tool-btn"
              (click)="zoomOut()"
              aria-label="Zoom out"
              title="Zoom out (-)"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                <path fill-rule="evenodd" d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z" clip-rule="evenodd" />
              </svg>
            </button>

            <button
              type="button"
              class="tool-btn"
              [class.active]="currentFit() === 'width'"
              (click)="fitWidth()"
              aria-label="Fit to width"
              title="Fit to width (W)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15" aria-hidden="true">
                <path d="M4 12h16"></path>
                <path d="M7 9l-3 3 3 3"></path>
                <path d="M17 9l3 3-3 3"></path>
                <line x1="2" y1="4" x2="2" y2="20"></line>
                <line x1="22" y1="4" x2="22" y2="20"></line>
              </svg>
            </button>

            <button
              type="button"
              class="tool-btn"
              [class.active]="currentFit() === 'page'"
              (click)="fitPage()"
              aria-label="Fit whole page"
              title="Fit whole page (P)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15" aria-hidden="true">
                <rect x="5" y="3" width="14" height="18" rx="2"></rect>
                <line x1="9" y1="7" x2="15" y2="7"></line>
                <line x1="9" y1="11" x2="15" y2="11"></line>
              </svg>
            </button>

            <button
              type="button"
              class="tool-btn"
              (click)="zoomIn()"
              aria-label="Zoom in"
              title="Zoom in (+)"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- RIGHT: Search, Download, Fullscreen -->
        <div class="toolbar-right">
          <!-- Search in Book Toggle Button -->
          <button
            type="button"
            class="button search-toggle-btn"
            [class.active]="showSearchPanel()"
            (click)="toggleSearchPanel()"
            aria-label="Toggle chapter search panel"
            [attr.aria-expanded]="showSearchPanel()"
            title="Search chapters & topics in book (F)"
          >
            <svg class="search-icon" viewBox="0 0 20 20" fill="currentColor" width="15" height="15" aria-hidden="true">
              <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd" />
            </svg>
            <span class="btn-label">Search in book</span>
          </button>

          <!-- File Info Badge -->
          @if (edition(); as ed) {
            <span class="file-info" [title]="ed.originalFilename">{{ ed.originalFilename }} ({{ formatBytes(ed.fileSize) }})</span>
            <a
              class="button button-primary download-button"
              [href]="downloadUrl()"
              download
              title="Download full PDF offline"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15" aria-hidden="true" class="dl-icon">
                <path fill-rule="evenodd" d="M10 3a.75.75 0 01.75.75v8.19l2.72-2.72a.75.75 0 111.06 1.06l-4 4a.75.75 0 01-1.06 0l-4-4a.75.75 0 111.06-1.06l2.72 2.72V3.75A.75.75 0 0110 3z" clip-rule="evenodd" />
                <path fill-rule="evenodd" d="M3.75 14.5a.75.75 0 01.75.75v1.5c0 .414.336.75.75.75h9.5a.75.75 0 00.75-.75v-1.5a.75.75 0 011.5 0v1.5A2.25 2.25 0 0114.75 19h-9.5A2.25 2.25 0 013 16.75v-1.5a.75.75 0 01.75-.75z" clip-rule="evenodd" />
              </svg>
              <span class="dl-text">Download PDF</span>
            </a>
          }

          <!-- Exit / Toggle Immersive Fullscreen -->
          <button
            type="button"
            class="tool-btn immersive-toggle-btn"
            (click)="toggleImmersive()"
            [title]="isImmersive() ? 'Exit immersive mode (Esc)' : 'Immersive full-screen (F)'"
            [attr.aria-label]="isImmersive() ? 'Exit immersive mode' : 'Enter immersive mode'"
          >
            @if (isImmersive()) {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15" aria-hidden="true">
                <path d="M4 14h6m0 0v6m0-6L3 21m17-7h-6m0 0v6m0-6l7 7M10 4v6m0 0H4m6 0L3 3m10 7V4m0 6h6m0 0l7-7"></path>
              </svg>
            } @else {
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15" aria-hidden="true">
                <path d="M15 3h6m0 0v6m0-6l-7 7M9 21H3m0 0v-6m0 6l7-7M21 9v6m0 0h-6m6 0l-7-7M3 15v6m0 0h6m0 0l-7-7"></path>
              </svg>
            }
          </button>
        </div>
      </header>

      <!-- Main Reader Body -->
      @if (loading()) {
        <div class="reader-loading" role="status" aria-live="polite">
          <div class="spinner"></div>
          <p>Loading digital edition…</p>
        </div>
      } @else if (error()) {
        <div class="reader-error" role="alert">
          <div class="alert alert-error surface-card">
            <h2>Digital Edition Unavailable</h2>
            <p>{{ error() }}</p>
            <a class="button button-secondary" [routerLink]="backLink()" [queryParams]="savedQueryParams()">Return to Book Details</a>
          </div>
        </div>
      } @else {
        <div class="reader-body">
          <!-- Collapsible & Resizable Chapter Search Panel (Left Drawer) -->
          @if (showSearchPanel()) {
            <aside
              class="search-sidebar"
              [style.width.px]="searchPanelWidth()"
              aria-label="Search within book"
            >
              <div class="sidebar-header">
                <div class="sidebar-title-row">
                  <div class="sidebar-title-wrap">
                    <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16" class="sidebar-search-icon" aria-hidden="true">
                      <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd" />
                    </svg>
                    <h2 class="sidebar-title">Search in Book</h2>
                  </div>
                  <button
                    type="button"
                    class="icon-close-btn"
                    (click)="toggleSearchPanel()"
                    aria-label="Close search panel"
                    title="Close search panel (Esc)"
                  >
                    ✕
                  </button>
                </div>

                <div class="search-input-group">
                  <div class="search-box-wrapper">
                    <input
                      type="text"
                      class="search-input"
                      placeholder="Search chapters or topics…"
                      [value]="searchQuery()"
                      (input)="searchQuery.set($any($event.target).value)"
                      (keydown.enter)="onSearch()"
                      aria-label="Search query"
                    />
                    @if (searchQuery()) {
                      <button type="button" class="clear-query-btn" (click)="clearSearch()" aria-label="Clear query">✕</button>
                    }
                  </div>
                  <button
                    type="button"
                    class="button button-primary search-action-btn"
                    (click)="onSearch()"
                    [disabled]="isSearching() || !searchQuery().trim()"
                  >
                    {{ isSearching() ? 'Searching…' : 'Search' }}
                  </button>
                </div>
              </div>

              <div class="sidebar-content">
                @if (isSearching()) {
                  <div class="search-status-box" role="status">
                    <div class="spinner-sm"></div>
                    <span>Searching document & indexing chapters…</span>
                  </div>
                } @else if (searchError()) {
                  <div class="search-error-box" role="alert">
                    <span>{{ searchError() }}</span>
                  </div>
                } @else if (hasSearched()) {
                  @if (searchResults(); as res) {
                    <div class="results-summary">
                      @if (res.totalMatches > 0) {
                        <span>Found <strong>{{ res.totalMatches }}</strong> {{ res.totalMatches === 1 ? 'match' : 'matches' }} in <strong>{{ (res.chapters || res.results || []).length }}</strong> {{ (res.chapters || res.results || []).length === 1 ? 'chapter' : 'chapters' }}</span>
                      } @else {
                        <span>No matches found for "<em>{{ res.query || searchQuery() }}</em>"</span>
                      }
                    </div>

                    @if (res.totalMatches > 0) {
                      <div class="results-list">
                        @for (chapterItem of (res.chapters || res.results || []); track chapterItem.chapterId) {
                          <section class="chapter-group">
                            <header class="chapter-group-header">
                              <span class="chapter-label" [title]="chapterItem.chapterTitle">
                                @if (chapterItem.chapterNumber != null) {Ch. {{ chapterItem.chapterNumber }}: }{{ chapterItem.chapterTitle }}
                              </span>
                              <span class="chapter-pages">pp. {{ chapterItem.startPage }}–{{ chapterItem.endPage }}</span>
                            </header>

                            <div class="match-cards">
                              @for (match of chapterItem.matches; track $index) {
                                <button
                                  type="button"
                                  class="match-card"
                                  [class.active]="isActiveMatch(match)"
                                  (click)="goToPage(match)"
                                  [attr.aria-label]="'Go to page ' + match.pageNumber"
                                >
                                  <div class="match-card-meta">
                                    <span class="match-page-badge">Page {{ match.pageNumber }}</span>
                                    @if (match.headingTitle) {
                                      <h4 class="match-heading-title">
                                        @for (part of renderSnippetParts(match.headingTitle, searchQuery()); track $index) {
                                          @if (part.isMatch) {
                                            <mark class="snippet-highlight">{{ part.text }}</mark>
                                          } @else {
                                            <span>{{ part.text }}</span>
                                          }
                                        }
                                      </h4>
                                    }
                                  </div>
                                  @if (match.snippet && match.snippet !== match.headingTitle) {
                                    <p class="match-snippet">
                                      @for (part of renderSnippetParts(match.snippet, searchQuery()); track $index) {
                                        @if (part.isMatch) {
                                          <mark class="snippet-highlight">{{ part.text }}</mark>
                                        } @else {
                                          <span>{{ part.text }}</span>
                                        }
                                      }
                                    </p>
                                  }
                                </button>
                              }
                            </div>
                          </section>
                        }
                      </div>
                    } @else {
                      <div class="empty-search-state">
                        <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                          <circle cx="11" cy="11" r="8"></circle>
                          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                        <p class="empty-title">No matching text found</p>
                        <p class="empty-hint">Try adjusting your keywords, checking spelling, or searching for broader terms.</p>
                      </div>
                    }
                  }
                } @else {
                  <div class="search-instructions">
                    <p class="instruction-title">Search inside this book</p>
                    <p class="instruction-hint">Enter keywords to search across extracted chapters, headings, and indexed PDF content. Clicking a result jumps directly to that page.</p>
                  </div>
                }
              </div>

              <!-- Resizer handle for dragging panel width -->
              <div
                class="panel-resizer"
                (mousedown)="startResize($event)"
                (touchstart)="startResize($event)"
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize search panel"
              ></div>
            </aside>
          }

          <!-- Viewport Area (Occupies remaining width & 100% height) -->
          <main class="reader-viewport" [class.with-sidebar]="showSearchPanel()">
            <iframe
              #pdfFrame
              class="pdf-frame"
              [src]="safeContentUrl()"
              title="Digital PDF Reader"
              allow="fullscreen"
              (load)="onFrameLoad($event)"
            ></iframe>
          </main>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100vh;
      overflow: hidden;
      background: #181C1A;
      color: #F5F8F5;
      font-family: var(--font-sans, system-ui, -apple-system, sans-serif);
    }

    .reader-shell {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      position: relative;
      background: #181C1A;
    }

    /* -------------------------------------------------------------
       1. COMPACT PROFESSIONAL READER TOOLBAR
       ------------------------------------------------------------- */
    .reader-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      height: 48px;
      padding: 0 1rem;
      background: #1F2421;
      border-bottom: 1px solid #2E3631;
      flex-shrink: 0;
      z-index: 50;
      user-select: none;
    }

    /* Toolbar Left */
    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      min-width: 0;
      flex: 1 1 auto;
      max-width: 36%;
    }

    .back-button {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      height: 30px;
      padding: 0 0.65rem;
      border-radius: 6px;
      background: #2A312D;
      color: #D1DCD5;
      border: 1px solid #3B4640;
      font-size: 0.78125rem;
      font-weight: 550;
      text-decoration: none;
      white-space: nowrap;
      flex-shrink: 0;
      transition: all 0.15s ease;
    }

    .back-button:hover {
      background: #343D38;
      border-color: #4C5952;
      color: #FFFFFF;
    }

    .btn-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .book-meta {
      display: flex;
      align-items: baseline;
      gap: 0.45rem;
      min-width: 0;
      overflow: hidden;
      white-space: nowrap;
    }

    .book-title {
      font-size: 0.84375rem;
      font-weight: 600;
      color: #F9FAF9;
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .meta-separator {
      color: #627268;
      font-size: 0.8rem;
    }

    .book-author {
      font-size: 0.78125rem;
      color: #9EAEA4;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Toolbar Center */
    .toolbar-center {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      flex-shrink: 0;
    }

    .page-indicator-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      background: #262C28;
      border: 1px solid #37413B;
      border-radius: 6px;
      padding: 2px 4px;
      height: 32px;
    }

    .tool-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      padding: 0;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 4px;
      color: #D1DCD5;
      cursor: pointer;
      transition: background-color 0.12s, border-color 0.12s, color 0.12s;
    }

    .tool-btn:hover:not(:disabled) {
      background: #353E38;
      border-color: #46524A;
      color: #FFFFFF;
    }

    .tool-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .tool-btn.active {
      background: #003D30;
      border-color: #005A47;
      color: #6EE7B7;
    }

    .page-input {
      width: 44px;
      height: 24px;
      background: #1B201D;
      border: 1px solid #3D4841;
      border-radius: 4px;
      color: #FFFFFF;
      font-size: 0.8125rem;
      font-weight: 600;
      text-align: center;
      padding: 0;
      outline: none;
      -moz-appearance: textfield;
      appearance: textfield;
      transition: border-color 0.15s;
    }

    .page-input::-webkit-outer-spin-button,
    .page-input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }

    .page-input:focus {
      border-color: #34D399;
      box-shadow: 0 0 0 1px #34D399;
    }

    .page-text {
      font-size: 0.78125rem;
      color: #9EAEA4;
      padding: 0 0.25rem;
      white-space: nowrap;
    }

    .selected-page-tag {
      font-size: 0.71875rem;
      font-weight: 600;
      color: #34D399;
      background: rgba(52, 211, 153, 0.12);
      border: 1px solid rgba(52, 211, 153, 0.25);
      border-radius: 4px;
      padding: 2px 6px;
      white-space: nowrap;
      margin-left: 0.2rem;
    }

    .toolbar-divider {
      width: 1px;
      height: 20px;
      background: #37413B;
    }

    .zoom-controls-group {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      background: #262C28;
      border: 1px solid #37413B;
      border-radius: 6px;
      padding: 2px 3px;
      height: 32px;
    }

    /* Toolbar Right */
    .toolbar-right {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.65rem;
      min-width: 0;
      flex: 1 1 auto;
      max-width: 36%;
    }

    .search-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      height: 30px;
      padding: 0 0.75rem;
      border-radius: 6px;
      background: #2A312D;
      color: #D1DCD5;
      border: 1px solid #3B4640;
      font-size: 0.78125rem;
      font-weight: 550;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.15s ease;
    }

    .search-toggle-btn:hover {
      background: #343D38;
      border-color: #4C5952;
      color: #FFFFFF;
    }

    .search-toggle-btn.active {
      background: #003D30;
      border-color: #005A47;
      color: #6EE7B7;
    }

    .file-info {
      font-size: 0.75rem;
      color: #8C9C92;
      max-width: 130px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .download-button {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      height: 30px;
      padding: 0 0.8rem;
      border-radius: 6px;
      background: #003D30;
      color: #FFFFFF;
      border: 1px solid #005A47;
      font-size: 0.78125rem;
      font-weight: 600;
      text-decoration: none;
      white-space: nowrap;
      transition: background 0.15s, border-color 0.15s;
    }

    .download-button:hover {
      background: #002B22;
      border-color: #004537;
    }

    .dl-icon {
      flex-shrink: 0;
    }

    .immersive-toggle-btn {
      width: 30px;
      height: 30px;
      border: 1px solid #3B4640;
      background: #2A312D;
      border-radius: 6px;
    }

    /* -------------------------------------------------------------
       2. READER MAIN BODY & VIEWPORT
       ------------------------------------------------------------- */
    .reader-body {
      display: flex;
      flex: 1;
      height: calc(100vh - 48px);
      overflow: hidden;
      position: relative;
    }

    .reader-viewport {
      flex: 1;
      height: 100%;
      position: relative;
      background: #262A2E;
      min-width: 0;
      overflow: hidden;
      transition: width 0.18s ease;
    }

    .pdf-frame {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
      background: #262A2E;
    }

    /* -------------------------------------------------------------
       3. SEARCH SIDEBAR PANEL (LEFT)
       ------------------------------------------------------------- */
    .search-sidebar {
      position: relative;
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #1C211E;
      border-right: 1px solid #2E3631;
      flex-shrink: 0;
      z-index: 40;
      overflow: hidden;
      box-shadow: 4px 0 16px rgba(0, 0, 0, 0.25);
    }

    .panel-resizer {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      width: 6px;
      cursor: col-resize;
      background: transparent;
      z-index: 50;
      transition: background 0.15s;
    }

    .panel-resizer:hover, .panel-resizer:active {
      background: #34D399;
    }

    .sidebar-header {
      padding: 0.9rem 1rem 0.8rem;
      border-bottom: 1px solid #2B332E;
      background: #222824;
      flex-shrink: 0;
    }

    .sidebar-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
    }

    .sidebar-title-wrap {
      display: flex;
      align-items: center;
      gap: 0.45rem;
    }

    .sidebar-search-icon {
      color: #34D399;
    }

    .sidebar-title {
      font-size: 0.9375rem;
      font-weight: 650;
      color: #F5F8F5;
      margin: 0;
    }

    .icon-close-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      background: transparent;
      border: none;
      border-radius: 4px;
      color: #9EAEA4;
      cursor: pointer;
      font-size: 0.85rem;
      transition: background 0.12s, color 0.12s;
    }

    .icon-close-btn:hover {
      background: #353E38;
      color: #FFFFFF;
    }

    .search-input-group {
      display: flex;
      gap: 0.45rem;
      align-items: center;
    }

    .search-box-wrapper {
      position: relative;
      flex: 1;
      display: flex;
      align-items: center;
    }

    .search-input {
      width: 100%;
      height: 32px;
      padding: 0 1.8rem 0 0.65rem;
      background: #171B19;
      border: 1px solid #37413B;
      border-radius: 6px;
      color: #FFFFFF;
      font-size: 0.8125rem;
      outline: none;
      transition: border-color 0.15s;
    }

    .search-input:focus {
      border-color: #34D399;
      box-shadow: 0 0 0 1px #34D399;
    }

    .clear-query-btn {
      position: absolute;
      right: 6px;
      width: 18px;
      height: 18px;
      background: transparent;
      border: none;
      color: #8C9C92;
      cursor: pointer;
      font-size: 0.75rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .clear-query-btn:hover {
      color: #FFFFFF;
    }

    .search-action-btn {
      height: 32px;
      padding: 0 0.85rem;
      border-radius: 6px;
      background: #003D30;
      color: #FFFFFF;
      border: 1px solid #005A47;
      font-size: 0.78125rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s;
    }

    .search-action-btn:hover:not(:disabled) {
      background: #002B22;
    }

    .search-action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .sidebar-content {
      flex: 1;
      overflow-y: auto;
      padding: 0.85rem;
    }

    .search-status-box {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 1.25rem;
      color: #9EAEA4;
      font-size: 0.8125rem;
      justify-content: center;
    }

    .spinner-sm {
      width: 16px;
      height: 16px;
      border: 2px solid #4B554F;
      border-top-color: #34D399;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .search-error-box {
      padding: 0.75rem 0.9rem;
      background: rgba(239, 68, 68, 0.12);
      border: 1px solid #EF4444;
      border-radius: 6px;
      color: #FCA5A5;
      font-size: 0.8125rem;
      margin-bottom: 0.8rem;
    }

    .results-summary {
      font-size: 0.78125rem;
      color: #9EAEA4;
      padding-bottom: 0.6rem;
      border-bottom: 1px solid #2B332E;
      margin-bottom: 0.85rem;
    }

    .results-summary strong {
      color: #F5F8F5;
    }

    .chapter-group {
      margin-bottom: 1.1rem;
    }

    .chapter-group-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.5rem;
      padding: 0.35rem 0.5rem;
      background: #242B27;
      border: 1px solid #2F3832;
      border-radius: 5px;
      margin-bottom: 0.45rem;
    }

    .chapter-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: #6EE7B7;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .chapter-pages {
      font-size: 0.72rem;
      color: #8C9C92;
      white-space: nowrap;
    }

    .match-cards {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .match-card {
      display: block;
      width: 100%;
      text-align: left;
      padding: 0.6rem 0.75rem;
      background: #202622;
      border: 1px solid #2F3833;
      border-radius: 6px;
      color: #D1DCD5;
      cursor: pointer;
      transition: background 0.12s, border-color 0.12s;
    }

    .match-card:hover {
      background: #28312B;
      border-color: #424E46;
    }

    .match-card.active {
      background: #143527;
      border-color: #34D399;
      box-shadow: 0 0 0 1px rgba(52, 211, 153, 0.4);
    }

    .match-card-meta {
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 0.45rem;
      margin-bottom: 0.25rem;
    }

    .match-heading-title {
      margin: 0;
      font-size: 0.84375rem;
      font-weight: 600;
      color: #F9FAF9;
      line-height: 1.35;
    }

    .match-card.active .match-heading-title {
      color: #A7F3D0;
    }

    .match-page-badge {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 600;
      color: #34D399;
      background: rgba(52, 211, 153, 0.12);
      border: 1px solid rgba(52, 211, 153, 0.2);
      padding: 0.15rem 0.45rem;
      border-radius: 3px;
    }

    .match-snippet {
      margin: 0;
      font-size: 0.78125rem;
      line-height: 1.4;
      color: #E2ECE5;
      word-break: break-word;
    }

    .snippet-highlight {
      background: rgba(251, 191, 36, 0.25);
      color: #FEF08A;
      font-weight: 600;
      padding: 0 0.15rem;
      border-radius: 2px;
    }

    .empty-search-state, .search-instructions {
      text-align: center;
      padding: 2.5rem 1rem;
      color: #8C9C92;
    }

    .empty-icon {
      width: 36px;
      height: 36px;
      color: #5D6B63;
      margin-bottom: 0.75rem;
    }

    .empty-title, .instruction-title {
      font-size: 0.9rem;
      font-weight: 600;
      color: #F5F8F5;
      margin: 0 0 0.35rem;
    }

    .empty-hint, .instruction-hint {
      font-size: 0.78125rem;
      line-height: 1.45;
      color: #8C9C92;
      margin: 0;
    }

    /* -------------------------------------------------------------
       4. LOADING & ERROR STATES
       ------------------------------------------------------------- */
    .reader-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      height: calc(100vh - 48px);
      background: #181C1A;
      color: #9EAEA4;
    }

    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid #333C37;
      border-top-color: #34D399;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .reader-error {
      display: flex;
      align-items: center;
      justify-content: center;
      height: calc(100vh - 48px);
      background: #181C1A;
      padding: 2rem;
    }

    .reader-error .alert {
      max-width: 480px;
      padding: 2rem;
      text-align: center;
      background: #202622;
      border: 1px solid #37413B;
      border-radius: 8px;
    }

    .reader-error h2 {
      margin: 0 0 0.65rem;
      color: #EF4444;
      font-size: 1.15rem;
    }

    .reader-error p {
      margin: 0 0 1.25rem;
      color: #D1DCD5;
      font-size: 0.875rem;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    }

    /* -------------------------------------------------------------
       5. RESPONSIVE MEDIA QUERIES
       ------------------------------------------------------------- */
    @media (max-width: 1024px) {
      .toolbar-left {
        max-width: 32%;
      }
      .toolbar-right {
        max-width: 40%;
      }
      .file-info {
        display: none;
      }
    }

    @media (max-width: 768px) {
      .reader-toolbar {
        padding: 0 0.5rem;
        gap: 0.4rem;
      }
      .toolbar-left {
        max-width: 30%;
      }
      .book-author, .meta-separator {
        display: none;
      }
      .back-text {
        display: none;
      }
      .dl-text {
        display: none;
      }
      .btn-label {
        display: none;
      }
      .search-sidebar {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        width: 85% !important;
        max-width: 320px;
        box-shadow: 6px 0 24px rgba(0, 0, 0, 0.5);
      }
      .panel-resizer {
        display: none;
      }
    }

    @media (max-width: 520px) {
      .zoom-controls-group {
        display: none;
      }
      .toolbar-divider {
        display: none;
      }
      .book-meta {
        display: none;
      }
    }
  `]
})
export class PdfReaderComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly service = inject(CatalogueService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly auth = inject(AuthService);

  readonly bookId = signal<string>(this.route.snapshot.paramMap.get('bookId') || '');
  readonly book = signal<BookDetail | null>(null);
  readonly edition = signal<DigitalEdition | null>(null);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string>('');

  // Chapter search state
  readonly showSearchPanel = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
  readonly isSearching = signal<boolean>(false);
  readonly hasSearched = signal<boolean>(false);
  readonly searchError = signal<string>('');
  readonly searchResults = signal<ChapterSearchResponse | null>(null);
  readonly pdfFrameRef = viewChild<ElementRef<HTMLIFrameElement>>('pdfFrame');
  readonly currentPage = signal<number>(1);
  readonly totalPages = signal<number | null>(null);
  readonly targetPage = signal<number | null>(null);
  readonly activeMatch = signal<ChapterSearchMatch | null>(null);

  // Layout & Viewing modes
  readonly currentFit = signal<'width' | 'page' | 'custom'>('width');
  readonly isImmersive = signal<boolean>(true);
  readonly searchPanelWidth = signal<number>(360);
  private isResizing = false;

  private readonly onMessageBound = (event: MessageEvent) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === 'pagechanged' && typeof data.pageNumber === 'number') {
      this.currentPage.set(data.pageNumber);
      if (typeof data.totalPages === 'number') {
        this.totalPages.set(data.totalPages);
      }
    } else if (data.type === 'documentloaded' && typeof data.totalPages === 'number') {
      this.totalPages.set(data.totalPages);
      if (typeof data.currentPage === 'number') {
        this.currentPage.set(data.currentPage);
      }
    }
  };

  backLink(): string[] {
    return this.router.url.startsWith('/workspace')
      ? ['/workspace/books', this.bookId()]
      : ['/books', this.bookId()];
  }

  savedQueryParams(): Record<string, string> {
    return this.route.snapshot.queryParams;
  }

  readonly viewerBaseUrl = computed<string>(() => {
    const rawContentUrl = this.service.digitalEditionContentUrl(this.bookId());
    return `/assets/pdfjs/viewer.html?file=${encodeURIComponent(rawContentUrl)}`;
  });

  readonly safeContentUrl = computed<SafeResourceUrl>(() => {
    const base = this.viewerBaseUrl();
    const page = this.targetPage() || this.currentPage();
    const url = page && page > 0 ? `${base}#page=${page}` : base;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  readonly downloadUrl = computed<string>(() => {
    return this.service.digitalEditionDownloadUrl(this.bookId());
  });

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.onMessageBound);
    }
  }

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('message', this.onMessageBound);
    }
  }

  loadData(): void {
    const id = this.bookId();
    if (!id) {
      this.error.set('No book specified.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.service.get(id).subscribe({
      next: b => this.book.set(b),
      error: () => { /* continue to load edition */ }
    });

    this.service.getDigitalEdition(id).pipe(
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: ed => this.edition.set(ed),
      error: err => {
        if (err.status === 404) {
          this.error.set('No digital edition is available for this book.');
        } else if (err.status === 401 || err.status === 403) {
          this.error.set('You do not have permission to view this digital edition.');
        } else {
          this.error.set('Failed to load digital edition. Please check your connection and try again.');
        }
      }
    });
  }

  toggleSearchPanel(): void {
    this.showSearchPanel.set(!this.showSearchPanel());
  }

  onSearch(): void {
    const query = this.searchQuery().trim();
    if (!query || !this.bookId()) return;

    this.isSearching.set(true);
    this.searchError.set('');
    this.service.searchChapters(this.bookId(), query, 0, 50).pipe(
      finalize(() => {
        this.isSearching.set(false);
        this.hasSearched.set(true);
      })
    ).subscribe({
      next: res => this.searchResults.set(res),
      error: err => {
        this.searchResults.set(null);
        if (err.status === 404) {
          const detail = (err.error?.message || '').toLowerCase();
          if (err.error?.code === 'DIGITAL_EDITION_NOT_FOUND' || detail.includes('digital edition')) {
            this.searchError.set('No digital edition is available for this book.');
          } else {
            this.searchError.set('No digital edition found for this book.');
          }
        } else if (err.status === 500 || err.status === 503) {
          this.searchError.set('Chapter indexing failed or is currently unavailable. Please try again.');
        } else {
          this.searchError.set('Failed to perform search. Please check your network connection and try again.');
        }
      }
    });
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchResults.set(null);
    this.hasSearched.set(false);
    this.searchError.set('');
    this.activeMatch.set(null);
  }

  stepPage(delta: number): void {
    const next = Math.max(1, (this.currentPage() || 1) + delta);
    this.goToRawPage(next);
  }

  onPageChange(val: any): void {
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 1) {
      this.goToRawPage(num);
    }
  }

  goToRawPage(pageNum: number): void {
    this.currentPage.set(pageNum);
    this.targetPage.set(pageNum);
    this.navigatePdfViewer(pageNum);
  }

  goToPage(match: ChapterSearchMatch): void {
    this.activeMatch.set(match);
    const pageNum = match.pageNumber;
    if (pageNum && pageNum >= 1) {
      this.goToRawPage(pageNum);
    }
  }

  isActiveMatch(match: ChapterSearchMatch): boolean {
    const cur = this.activeMatch();
    if (!cur) return false;
    if (cur.pageNumber !== match.pageNumber) return false;
    if (cur.headingTitle && match.headingTitle) {
      return cur.headingTitle === match.headingTitle;
    }
    return cur.snippet === match.snippet;
  }

  zoomIn(): void {
    this.postViewerMessage({ type: 'zoomIn' });
    this.currentFit.set('custom');
  }

  zoomOut(): void {
    this.postViewerMessage({ type: 'zoomOut' });
    this.currentFit.set('custom');
  }

  fitWidth(): void {
    this.currentFit.set('width');
    this.postViewerMessage({ type: 'fitWidth', scale: 'page-width' });
  }

  fitPage(): void {
    this.currentFit.set('page');
    this.postViewerMessage({ type: 'fitPage', scale: 'page-fit' });
  }

  toggleImmersive(): void {
    if (typeof document !== 'undefined') {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
        this.isImmersive.set(true);
      } else {
        document.exitFullscreen?.().catch(() => {});
        this.isImmersive.set(false);
      }
    } else {
      this.isImmersive.set(!this.isImmersive());
    }
  }

  startResize(event: MouseEvent | TouchEvent): void {
    event.preventDefault();
    this.isResizing = true;
    const startX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const startWidth = this.searchPanelWidth();

    const onMove = (moveEvt: MouseEvent | TouchEvent) => {
      if (!this.isResizing) return;
      const clientX = 'touches' in moveEvt ? moveEvt.touches[0].clientX : moveEvt.clientX;
      const delta = clientX - startX;
      const newWidth = Math.min(Math.max(260, startWidth + delta), Math.min(560, window.innerWidth * 0.6));
      this.searchPanelWidth.set(newWidth);
    };

    const onEnd = () => {
      this.isResizing = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onEnd);
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return;
    }

    if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
      event.preventDefault();
      this.stepPage(-1);
    } else if (event.key === 'ArrowRight' || event.key === 'PageDown') {
      event.preventDefault();
      this.stepPage(1);
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      this.zoomIn();
    } else if (event.key === '-') {
      event.preventDefault();
      this.zoomOut();
    } else if (event.key === 'w' || event.key === 'W') {
      this.fitWidth();
    } else if (event.key === 'p' || event.key === 'P') {
      this.fitPage();
    } else if (event.key === 'f' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.toggleSearchPanel();
    } else if (event.key === 'Escape') {
      if (this.showSearchPanel()) {
        this.showSearchPanel.set(false);
      }
    }
  }

  navigatePdfViewer(pageNumber: number): void {
    const iframe = this.pdfFrameRef()?.nativeElement;
    if (!iframe) return;

    const query = this.searchQuery().trim();

    try {
      const win = iframe.contentWindow;
      if (win) {
        win.postMessage({
          type: 'goToPage',
          pageNumber: pageNumber,
          page: pageNumber
        }, '*');

        if (query) {
          win.postMessage({
            type: 'find',
            query: query
          }, '*');
        }

        if (win.location) {
          win.location.hash = `page=${pageNumber}`;
        }
      }
    } catch {
      const base = this.viewerBaseUrl();
      iframe.src = `${base}#page=${pageNumber}`;
    }
  }

  private postViewerMessage(message: any): void {
    const iframe = this.pdfFrameRef()?.nativeElement;
    if (!iframe || !iframe.contentWindow) return;
    try {
      iframe.contentWindow.postMessage(message, '*');
    } catch (err) {
      console.warn('Failed to postMessage to PDF viewer:', err);
    }
  }

  renderSnippetParts(snippet: string, query: string): { text: string; isMatch: boolean }[] {
    if (!snippet) return [];
    const cleanTerms = (query || '')
      .replace(/^(?:chapter|ch\.?|unit|part|section)\s+\d+[\s:.-–—]*/i, ' ')
      .trim()
      .split(/\s+/)
      .filter(t => t.length > 1 && !/^[–—:.,;()\[\]{}]+$/.test(t))
      .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!cleanTerms.length) {
      return [{ text: snippet, isMatch: false }];
    }
    const regex = new RegExp(`(${cleanTerms.join('|')})`, 'gi');
    const parts: { text: string; isMatch: boolean }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(snippet)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: snippet.substring(lastIndex, match.index), isMatch: false });
      }
      parts.push({ text: match[0], isMatch: true });
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < snippet.length) {
      parts.push({ text: snippet.substring(lastIndex), isMatch: false });
    }
    return parts;
  }

  formatBytes(bytes: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }

  onFrameLoad(event: Event): void {
    try {
      const iframe = event.target as HTMLIFrameElement;
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (doc) {
        const text = (doc.body?.innerText || doc.body?.textContent || '').trim();
        if (text.includes('DIGITAL_EDITION_NOT_FOUND') || (text.startsWith('{') && text.includes('"code"'))) {
          try {
            const parsed = JSON.parse(text);
            this.error.set(parsed.message || 'The requested digital edition file could not be found in storage.');
          } catch {
            this.error.set('The requested digital edition file could not be found in storage.');
          }
        }
      }
    } catch {
      // Cross-origin framing or protected binary stream, ignore
    }
  }
}
