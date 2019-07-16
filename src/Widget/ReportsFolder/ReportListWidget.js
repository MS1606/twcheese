import { ImageSrc } from '/twcheese/conf/ImageSrc.js';
import { Resources } from '/twcheese/src/Models/Resources.js';
import { buildingUtil } from '/twcheese/src/Models/Buildings.js';
import { troopUtil } from '/twcheese/src/Models/Troops.js';
import { BattleReportCondensed } from '/twcheese/src/Models/BattleReportCondensed.js';
import { textScraper } from '/twcheese/src/Scrape/TextScraper.js';
import { AbstractWidget } from '/twcheese/src/Widget/AbstractWidget.js';
import { gameUrl } from '/twcheese/src/Util/Network.js';
import { userConfig } from '/twcheese/src/Util/Config.js';


var language = { "twcheese": {} };
switch (game_data.market) {
    default:
        /*==== tribalwars.net, tribalwars.us, tribalwars.co.uk, beta.tribalwars.net ====*/
        language['twcheese']['Building'] = 'Building';
        break;

    case 'cz':
        /*==== divokekmeny.cz/ ====*/
        language['twcheese']['Building'] = 'budově';
        break;

    case 'se':
        language['twcheese']['Building'] = 'Byggnad';
        break;

    /*==== fyletikesmaxes.gr/ ====*/
    case 'gr':
        language['twcheese']['Building'] = 'Κτίριο';
        break;

    /* Norwegian */
    case 'no':
        language['twcheese']['Building'] = 'Bygning';
        break;
                        
}


function centeredImg(src, tooltip = '') {
    return `<img style="display:block; margin-left:auto; margin-right:auto" src="${src}" title="${tooltip}">`;
}


function villageLink(village) {
    let url = gameUrl('info_village', {id: village.id});
    return `<a href="${url}">${village.x}|${village.y}</a>`;
}


function cellAtIndex(row, i) {
    let endIndex = -1;
    for (let cell of row.cells) {
        let initialColSpan = cell.initialColSpan || cell.colSpan;
        endIndex += initialColSpan;
        if (endIndex >= i) {
            return cell;
        }
    }
}


class ReportListWidget extends AbstractWidget {
    /**
     * @param {Map.<number, BattleReportCondensed>} reports 
     */
    constructor(reports) {
        super();
        this.reports = reports;
        this.columnIndexes = new Map();

        this.initStructure();
        this.$el.resizable();
        this.watchSelf();
    }

    initStructure() {
        var reportsFolderDisplay = document.createElement('div');
        reportsFolderDisplay.id = 'twcheese_reportsFolderDisplay';
        reportsFolderDisplay.style.overflow = 'hidden';
        reportsFolderDisplay.style.position = 'relative';
        reportsFolderDisplay.style.width = '646px';
        reportsFolderDisplay.style.height = '400px';
        reportsFolderDisplay.style.minHeight = '100px';
        reportsFolderDisplay.style.minWidth = '100px';        

        /*==== reports table header ====*/
        var reportsTableHeaderDiv = document.createElement('div');
        reportsFolderDisplay.appendChild(reportsTableHeaderDiv);
        reportsTableHeaderDiv.style.overflow = 'hidden';

        var reportsTableHeader = document.createElement('table');
        reportsTableHeaderDiv.appendChild(reportsTableHeader);
        reportsTableHeader.style.tableLayout = 'fixed';
        reportsTableHeader.style.width = '2370px';
        reportsTableHeader.id = 'twcheese_reportsTable_header';

        /*==== create headers ====*/
        reportsTableHeader.insertRow(-1);
        reportsTableHeader.insertRow(-1);
        reportsTableHeader.insertRow(-1);

        let cellIndex = 0;
        for (let category of ReportListWidget.columnCategories) {
            let titleTh = document.createElement('th');
            titleTh.innerHTML = category.title || '';
            titleTh.initialColSpan = category.cols.length;
            titleTh.colSpan = category.cols.length;
            reportsTableHeader.rows[1].appendChild(titleTh);

            let widthSum = 0;
            let colIndexes = [];
            for (let col of category.cols) {
                let alignmentTh = document.createElement('th');
                alignmentTh.style.width = col.width + 'px';
                alignmentTh.style.paddingTop = 0;
                alignmentTh.style.paddingBottom = 0;
                reportsTableHeader.rows[0].appendChild(alignmentTh);

                let lowerTh = document.createElement('th');
                lowerTh.innerHTML = col.header;
                reportsTableHeader.rows[2].appendChild(lowerTh);

                widthSum += col.width;
                colIndexes.push(cellIndex);
                cellIndex++;
            }
            let borderSpacing = 2 * (category.cols.length - 1);
            titleTh.style.width = (widthSum + borderSpacing) + 'px';
            this.columnIndexes.set(category.key, colIndexes);
        }

        /*==== reports table body ====*/
        var reportsTableBodyDiv = document.createElement('div');
        reportsFolderDisplay.appendChild(reportsTableBodyDiv);
        reportsTableBodyDiv.style.overflow = 'hidden';
        reportsTableBodyDiv.style.height = Number(400 - 20 - reportsTableHeaderDiv.clientHeight) + 'px';
        reportsTableBodyDiv.style.width = '646px';
        reportsTableBodyDiv.id = 'twcheese_reportsTable';


        var reportsTableBody = document.createElement('table');
        reportsTableBodyDiv.appendChild(reportsTableBody);
        reportsTableBody.style.tableLayout = 'fixed';
        reportsTableBody.style.width = '2370px';
        reportsTableBody.id = 'twcheese_reportsTable_body';
        reportsTableBody.className = 'vis';

        /*==== create first row to match widths to header table ====*/
        reportsTableBody.insertRow(-1);
        for (let alignmentTh of reportsTableHeader.rows[0].cells) {
            let alignmentCell = reportsTableBody.rows[0].insertCell(-1);
            alignmentCell.style.width = alignmentTh.style.width;
            alignmentCell.style.paddingTop = 0;
            alignmentCell.style.paddingBottom = 0;
        }

        /*==== y scroll panel====*/
        var yScrollPanel = document.createElement('div');
        yScrollPanel.id = 'twcheese_reportsDisplay_yScrollPanel';
        reportsFolderDisplay.appendChild(yScrollPanel);
        yScrollPanel.style.overflowY = 'scroll';
        yScrollPanel.style.overflowX = 'hidden';
        yScrollPanel.style.background = 'transparent';
        yScrollPanel.style.position = 'absolute';
        yScrollPanel.style.right = 0;
        yScrollPanel.style.scrollbarWidth = 'thin';

        /*==== y table emulator ====*/
        var yTableEmulator = document.createElement('div');
        yTableEmulator.id = 'twcheese_reportsDisplay_y-table-emulator';
        yScrollPanel.appendChild(yTableEmulator);
        yTableEmulator.style.height = reportsTableBody.clientHeight;
        yTableEmulator.style.overflow = 'hidden';
        yTableEmulator.style.position = 'relative';
        yTableEmulator.innerHTML = '&nbsp;';

        /*==== x scroll panel ====*/
        var xScrollPanel = document.createElement('div');
        xScrollPanel.id = 'twcheese_reportsDisplay_xScrollPanel';
        reportsFolderDisplay.appendChild(xScrollPanel);
        xScrollPanel.style.height = '40px';
        xScrollPanel.style.width = `calc(100% - 18px)`;
        xScrollPanel.style.marginTop = '-23px';
        xScrollPanel.style.overflowX = 'scroll';
        xScrollPanel.style.overflowY = 'hidden';
        xScrollPanel.style.marginTop = 'expression(\'0px\')';// IE 7 fix
        xScrollPanel.style.height = 'expression(\'17px\')'; // IE 7 fix

        /*==== x table emulator ====*/
        var xTableEmulator = document.createElement('div');
        xTableEmulator.id = 'twcheese_reportsDisplay_x-table-emulator';
        xScrollPanel.appendChild(xTableEmulator);
        xTableEmulator.style.width = reportsTableHeader.clientWidth + 'px';
        xTableEmulator.innerHTML = '&nbsp;';
        
        this.$el = $(reportsFolderDisplay);
        this.$head = this.$el.find('#twcheese_reportsTable_header');
        this.$body = this.$el.find('#twcheese_reportsTable_body');
        this.$bodyPane = this.$el.find('#twcheese_reportsTable');
        this.$xBodyEmulator = this.$el.find('#twcheese_reportsDisplay_x-table-emulator');
        this.$yBodyEmulator = this.$el.find('#twcheese_reportsDisplay_y-table-emulator');
        this.$xScrollPanel = this.$el.find('#twcheese_reportsDisplay_xScrollPanel');
        this.$yScrollPanel = this.$el.find('#twcheese_reportsDisplay_yScrollPanel');
    }


    afterInsert() {
        let $headContainer = this.$head.parent();
        this.$yScrollPanel.css({
            height: 400 - 20 - $headContainer.outerHeight(),
            top: $headContainer.outerHeight() + 2
        });
        this.populateReportsTable();
        this.applySettings();
    }


    watchSelf() {
        this.$el.on('resize', (e) => {
            this.fitDisplayComponents();
            userConfig.set('ReportListWidget.size.width', this.$el.width());
            userConfig.set('ReportListWidget.size.height', this.$el.height());
        });

        this.$bodyPane.on('scroll', (e) => {
            this.$xScrollPanel.scrollTop(this.$bodyPane.scrollTop());
        });

        this.$yScrollPanel.on('scroll', (e) => {
            this.$bodyPane.scrollTop(this.$yScrollPanel.scrollTop());
        });

        this.$xScrollPanel.on('scroll', (e) => {
            this.$bodyPane.scrollLeft(this.$xScrollPanel.scrollLeft());
            this.$head.parent().scrollLeft(this.$xScrollPanel.scrollLeft());
        });

        this.$bodyPane.on('wheel', (e) => {
            e.preventDefault();
            let deltaY = 90 * Math.sign(e.originalEvent.deltaY);
            
            let timeStart = performance.now();
            let animDurationMs = 250;
            let y = 0;

            let scrollStep = () => {
                let msElapsed = performance.now() - timeStart;
                let targetY = deltaY * Math.min(1, msElapsed / animDurationMs);
                let stepY = targetY - y;

                y += stepY;
                this.$yScrollPanel[0].scrollTop += stepY;
                this.$bodyPane[0].scrollTop += stepY;

                if (msElapsed < animDurationMs) {
                    window.requestAnimationFrame(scrollStep);
                }
            }
            window.requestAnimationFrame(scrollStep);
        });
    }


    /**
     * fills body with information
     */
    populateReportsTable() {
        let minimal = new Set(['essential', 'repeatLinks', 'distance', 'fullSubject', 'strTimeReceived']);

        let fallbackSubjectColSpan = ReportListWidget.columnCategories.reduce(function(acc, category) {
            if (category.key !== 'fullSubject' && minimal.has(category.key)) {
                return acc;
            }
            return acc + category.cols.length;
        }, 0);

        for (let report of this.reports.values()) {
            let row = this.$body[0].insertRow(-1);
            row.twcheeseReport = report;
            let hasDecentInfo = report.attackerName && report.defenderName && report.attackerVillage && report.defenderVillage;

            for (let category of ReportListWidget.columnCategories) {
                if (!hasDecentInfo && !minimal.has(category.key)) {
                    continue;
                }
                for (let col of category.cols) {
                    let cell = row.insertCell(-1);
                    cell.innerHTML = col.createCellHtml(report);
                    if (typeof col.align === 'string') {
                        cell.style.textAlign = col.align;
                    }
                    if (typeof col.cssClass === 'function') {
                        cell.className = col.cssClass(report);
                    }
                    if (!hasDecentInfo && category.key === 'fullSubject') {
                        cell.initialColSpan = fallbackSubjectColSpan;
                        cell.colSpan = cell.initialColSpan;
                    }                    
                }                
            }
        }
        
        this.alignForTroops();
        this.alignForResources();
        this.adjustScrollbars();
    }


    /**
     * hides columns and resizes to user's preferences
     */
    applySettings() {
        for (let category of ReportListWidget.columnCategories) {
            if (!userConfig.get(`ReportListWidget.showCols.${category.key}`, true)) {
                this.hideColumns(category.key);
            }
        }

        this.$el.css({
            width: userConfig.get('ReportListWidget.size.width', '720px'),
            height: userConfig.get('ReportListWidget.size.height', '250px')
        });
                
        this.fitDisplayComponents();
        this.adjustScrollbars();
    }


    adjustScrollbars() {
        this.$xBodyEmulator.width(this.$body.width());
        this.$yBodyEmulator.height(this.$body.height());
    }


    toggleReportsColumns(settingName) {
        let configKey = `ReportListWidget.showCols.${settingName}`;
        let show = !userConfig.get(configKey, true);
        userConfig.set(configKey, show);

        for (let i of this.columnIndexes.get(settingName)) {
            if (show) {
                this.showColumn(i);
            } else {
                this.hideColumn(i);
            }
        }
        this.adjustScrollbars();
    }


    hideColumns(settingName) {
        for (let i of this.columnIndexes.get(settingName)) {
            this.hideColumn(i);
        }
    }


    showColumn(column) {
        var body = this.$body[0];
        var head = this.$head[0];

        var tableWidth = head.style.width.split('px')[0];        

        /*==== header ====*/
        let alignmentTh = cellAtIndex(head.rows[0], column);
        let columnWidth = alignmentTh.style.width.split('px')[0];
        tableWidth = parseFloat(tableWidth) + parseFloat(columnWidth);
        head.style.width = tableWidth + 'px';

        alignmentTh.style.display = "table-cell";
        cellAtIndex(head.rows[1], column).style.display = "table-cell";
        head.rows[2].cells[column].style.display = "table-cell";

        /*==== body ====*/
        body.style.width = tableWidth + 'px';
        for (let row of body.rows) {
            let cell = cellAtIndex(row, column);

            if (cell.initialColSpan && cell.initialColSpan > 1) {
                cell.colSpan += 1;
            } else {
                cell.style.display = 'table-cell';
            }
        }
    }


    hideColumn(column) {
        var body = this.$body[0];
        var head = this.$head[0];

        var tableWidth = head.style.width.split('px')[0];

        /*==== header ====*/
        let alignmentTh = cellAtIndex(head.rows[0], column);
        let columnWidth = alignmentTh.style.width.split('px')[0];
        tableWidth = parseFloat(tableWidth) - parseFloat(columnWidth);
        head.style.width = tableWidth + 'px';

        alignmentTh.style.display = "none";
        cellAtIndex(head.rows[1], column).style.display = "none";
        head.rows[2].cells[column].style.display = "none";

        /*==== body ====*/
        body.style.width = tableWidth + 'px';
        for (let row of body.rows) {
            let cell = cellAtIndex(row, column);

            if (cell.initialColSpan && cell.initialColSpan > 1) {
                cell.colSpan -= 1;
            } else {
                cell.style.display = 'none';
            }
        }
    }


    getSelectedReportIds() {
        return this.$body.find('input:checked')
            .toArray()
            .map(el => parseInt(el.name.match(/\d+/)[0]));
    }

    refreshContents() {
        this.$body.find('tr:not(:first)').remove();    
        this.populateReportsTable();
        this.applySettings();    
    }

    /**
     * sets display components styles to fill the display zone and ensure scrolling functionality
     */
    fitDisplayComponents() {
        let bodyPaneHeight = this.$el.height() - 67;

        this.$bodyPane.css({
            width: this.$el.width(),
            height: bodyPaneHeight
        });
        
        this.$yScrollPanel.css({height: bodyPaneHeight});
    }


    /**
     * adjust widths for troop counts
     */
    alignForTroops() {
        let colIndexes = this.columnIndexes.get('defenderSurvivors');

        let maxChars = Array(colIndexes.length).fill(2);

        for (let r = 1; r < this.$body[0].rows.length; r++) {
            let row = this.$body[0].rows[r];
            if (!row.twcheeseReport.defenderSurvivors) {
                continue;
            }
            for (let [i, col] of Object.entries(colIndexes)) {
                let chars = String(row.cells[col].innerHTML).length;
                maxChars[i] = Math.max(chars, maxChars[i]);
            }
        }

        this.alignCols(colIndexes, maxChars);
    }


    /**
     * adjust widths for resources
     */
    alignForResources() {
        let colIndexes = [
            ...this.columnIndexes.get('resources.wood'),
            ...this.columnIndexes.get('resources.stone'),
            ...this.columnIndexes.get('resources.iron'),
            ...this.columnIndexes.get('resources.sum'),
        ];

        let maxChars = [2, 2, 2, 2];

        for (let r = 1; r < this.$body[0].rows.length; r++) {
            let row = this.$body[0].rows[r];
            if (!row.twcheeseReport.resources) {
                continue;
            }
            for (let [i, col] of Object.entries(colIndexes)) {
                let chars = row.cells[col].innerText.length;
                maxChars[i] = Math.max(chars, maxChars[i]);
            }
        }

        this.alignCols(colIndexes, maxChars);
    }


    alignCols(colIndexes, maxChars) {
        let charWidth = 8;
        let widthSum = 0;
        for (let [i, col] of Object.entries(colIndexes)) {
            let width = charWidth * maxChars[i];
            width = Math.max(20, width);
            widthSum += width;

            let alignmentTh = this.$head[0].rows[0].cells[col];
            let bodyCell = this.$body[0].rows[0].cells[col];

            alignmentTh.style.width = width + 'px';
            bodyCell.style.width = width + 'px';
        }

        let padding = 3 * 2 * colIndexes.length;
        let borderSpacing = 2 * (colIndexes.length - 1);
        let width = widthSum + borderSpacing + padding;
        
        let titleTh = cellAtIndex(this.$head[0].rows[1], colIndexes[0]);
        titleTh.style.width = width + 'px';
    }


    selectMatchingReports(isReportMatch) {
        for (let report of this.reports.values()) {
            if (isReportMatch(report)) {
                $(`input[name='id_${report.reportId}']`).prop('checked', true);
            }
        }
    }

    deselectAllReports() {
        for (let report of this.reports.values()) {
            $(`input[name='id_${report.reportId}']`).prop('checked', false);
        }
    }

}

ReportListWidget.columnCategories = [
    {
        key: 'essential',
        hideable: false,
        cols: [{
            width: 120,
            header: '',
            createCellHtml(report) {
                let icons = [`<img src="${ImageSrc.dotIcon(report.dotColor)}">`];
                if (report.haulStatus !== BattleReportCondensed.HAUL_STATUS_UNKNOWN) {
                    icons.push(`<img src="${report.haulStatusIconSrc()}">`);
                }
                if (report.isForwarded) {
                    icons.push('<img src="graphic/forwarded.png?1">');
                }
                let html = `<input name="id_${report.reportId}" type="checkbox"> ${icons.join(' ')}
                    <a href="${gameUrl('report', {mode:game_data.mode, view:report.reportId})}"> view</a>
                `;
                if (report.defenderName && report.defenderVillage) {
                    let isDefenderMe = report.defenderName == game_data.player.name;
                    let wasVillageConquered = report.loyalty && report.loyalty.after <= 0;
                    if (isDefenderMe || wasVillageConquered) {
                        html += `<a href="${gameUrl('place', {mode:'units', village:report.defenderVillage.id})}">
                            <img title="manage troops" style="float:right; cursor:pointer;" src="${ImageSrc.buildingIcon('place')}" />
                        </a>`;
                    }
                }
                return html;
            }
        }]
    },

    {
        key: 'repeatLinks',
        hideable: true,
        description: 'Links to repeat attack',
        cols: [{
            width: 50,
            header: 'Repeat',
            createCellHtml(report) {
                if (report.attackerName !== game_data.player.name) {
                    return '';
                }
                let url = gameUrl('place', {try: 'confirm', type: 'same', report_id: report.reportId});
                let html = `<a title="repeat attack, from current village" href="${url}"><img src="${ImageSrc.attack}"></a>`;
                if (report.attackerVillage && report.attackerVillage.id) {
                    let url = gameUrl('place', {try: 'confirm', type: 'same', report_id: report.reportId, village: report.attackerVillage.id});
                    html += ` | <a title="repeat attack, from original village" href="${url}"><img src="${ImageSrc.attack}"></a>`;
                }
                return html;
            }
        }]
    },
    {
        key: 'distance',
        hideable: true,
        description: 'Distance',
        cols: [{
            width: 60,
            header: 'Distance',
            createCellHtml: (report) => report.defenderDistance(game_data.village)
        }]
    },
    {
        key: 'fullSubject',
        hideable: true,
        description: 'Full subject',
        cols: [{
            width: 400,
            header: 'Subject',
            createCellHtml: (report) => report.subject
        }]
    },
    {
        key: 'note',
        hideable: true,
        description: 'Note',
        cols: [{
            width: 200,
            header: 'Note',
            createCellHtml: (report) => report.note || ''
        }]
    },
    {
        key: 'attackerName',
        hideable: true,
        description: 'Attacker',
        cols: [{
            width: 150,
            header: 'Attacker',
            createCellHtml: (report) => report.attackerName || ''
        }]
    },
    {
        key: 'defenderName',
        hideable: true,
        description: 'Defender',
        cols: [{
            width: 150,
            header: 'Defender',
            createCellHtml: (report) => report.defenderName || ''
        }]
    },
    {
        key: 'attackerVillage',
        hideable: true,
        description: `Attacker's village`,
        cols: [{
            width: 70,
            header: 'Origin',
            createCellHtml(report) {
                if (!report.attackerVillage) {
                    return '';
                }
                return villageLink(report.attackerVillage);
            }
        }]
    },
    {
        key: 'defenderVillage',
        hideable: true,
        description: `Defender's village`,
        cols: [{
            width: 70,
            header: 'Target',
            createCellHtml(report) {
                if (!report.defenderVillage) {
                    return '';
                }
                return villageLink(report.defenderVillage);
            }
        }]
    },
    {
        key: 'feint',
        hideable: true,
        description: 'Feint',
        cols: [{
            width: 50,
            header: 'Feint',
            createCellHtml(report) {
                if (report.wasAttackFeint) {
                    return centeredImg('graphic/dots/grey.png?1', 'The attack contained only a small amount of units');
                }
                return '';
            }
        }]
    },
    {
        key: 'deadNoble',
        hideable: true,
        description: 'Attacking noble died',
        cols: [{
            width: 50,
            header: 'Noble',
            createCellHtml(report) {
                if (!report.attackerNobleDied) {
                    return '';
                }
                let img = centeredImg(ImageSrc.troopIcon('priest'), 'An attacking nobleman died.');
                if (report.attackerVillage && report.attackerName === game_data.player.name) {
                    let url = gameUrl('snob', {village: report.attackerVillage.id});
                    return `<a href="${url}">${img}</a>`;
                }
                return img;
            }
        }]
    },
    {
        key: 'loyalty',
        hideable: true,
        description: 'Loyalty reported',
        cols: [{
            width: 50,
            header: 'Loyalty',
            createCellHtml(report) {
                if (report.loyalty) {
                    return '<span class="icon ally lead" title="Loyalty change"></span> ' + report.loyalty.after;
                }
                return '';
            }
        }]
    },
    {
        key: 'defenderSurvivors',
        hideable: true,
        description: 'Troops: Defense remaining',
        title: 'Defense remaining',
        cols: troopUtil.troopTypesOnWorld().map(troopType => {
            return {
                width: 20,
                align: 'center',
                header: centeredImg(ImageSrc.troopIcon(troopType)),
                createCellHtml(report) {
                    if (!report.defenderSurvivors) {
                        return '';
                    }
                    let survivorCount = report.defenderSurvivors[troopType];
                    return survivorCount;
                },
                cssClass(report) {
                    if (!report.defenderSurvivors) {
                        return '';
                    }
                    let survivorCount = report.defenderSurvivors[troopType];
                    return (survivorCount === 0) ? 'unit-item hidden' : '';
                }
            };
        })
    },

    ...buildingUtil.buildingTypesOnWorld().map(function(buildingType) {
        return {
            key: 'buildingLevels.' + buildingType,
            hideable: true,
            description: language['twcheese']['Building'] + ': ' + textScraper.t(`buildings.${buildingType}`),
            cols: [{
                width: 20,
                align: 'center',
                header: centeredImg(ImageSrc.buildingIcon(buildingType)),
                createCellHtml(report) {
                    if (!report.buildingLevels) {
                        return '';
                    }
                    let level = report.buildingLevels[buildingType];
                    if (level === '?') {
                        return '';
                    }
                    return level;
                },
                cssClass(report) {
                    if (!report.buildingLevels) {
                        return '';
                    }
                    let level = report.buildingLevels[buildingType];
                    return ['?', 0].includes(level) ? 'hidden' : '';
                }
            }]
        };
    }),

    ...Resources.TYPES.map(function(resType) {
        let resName = {wood:'Timber', stone:'Clay', iron:'Iron'}[resType];
        return {
            key: `resources.${resType}`,
            hideable: true,
            description: `Resources: ${resName}`,
            cols: [{
                width: 16,
                align: 'center',
                header: centeredImg(ImageSrc[resType]),
                createCellHtml(report) {
                    if (!report.resources) {
                        return '';                        
                    }
                    return window.Format.number(report.resources[resType].amount);
                },
                cssClass(report) {
                    if (!report.resources) {
                        return '';                        
                    }
                    return (report.resources[resType].amount === 0) ? 'hidden' : '';
                }
            }]
        };
    }),

    {
        key: 'resources.sum',
        hideable: true,
        description: 'Resources: Total',
        cols: [{
            width: 40,
            align: 'center',
            header: 'Total',
            createCellHtml(report) {
                if (!report.resources) {
                    return '';                        
                }
                return window.Format.number(report.resources.sum());
            },
            cssClass(report) {
                if (!report.resources) {
                    return '';                        
                }
                return (report.resources.sum() === 0) ? 'hidden' : '';
            }
        }]
    },
    {
        key: 'timelaunched',
        hideable: true,
        description: 'Time: Attack launched',
        cols: [{
            width: 170,
            header: 'Launched',
            createCellHtml(report) {
                if (!report.timeLaunched) {
                    return '';
                }
                return report.timeLaunched.toHtml(false);
            }
        }]
    },
    {
        key: 'strTimeReceived',
        hideable: true,
        description: 'Time: Report received',
        cols: [{
            width: 140,
            header: 'Received',
            createCellHtml: (report) => report.strTimeReceived || ''
        }]
    }
];


export { ReportListWidget };