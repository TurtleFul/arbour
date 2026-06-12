import { library, icon as faIcon } from "@fortawesome/fontawesome-svg-core";
import type { IconName } from "@fortawesome/fontawesome-svg-core";
import {
    faArrowAltCircleUp, faArrowUp, faCog, faEdit, faEllipsisV,
    faEye, faEyeSlash, faList, faPause, faStop, faPlay, faPlus,
    faSearch, faTachometerAlt, faTimes, faTimesCircle, faTrash,
    faCheckCircle, faStream, faSave, faExclamationCircle, faBullhorn,
    faArrowsAltV, faUnlink, faQuestionCircle, faImages, faUpload,
    faCopy, faCheck, faFile, faAward, faLink, faChevronDown,
    faChevronRight, faChevronUp, faSignOutAlt, faPen,
    faExternalLinkSquareAlt, faSpinner, faUndo, faPlusCircle,
    faAngleDown, faWrench, faHeartbeat, faFilter, faInfoCircle,
    faClone, faCertificate, faTerminal, faWarehouse, faHome,
    faRocket, faRotate, faCloudArrowDown, faArrowsRotate, faFileText,
    faFileImport, faChevronCircleRight, faChevronCircleDown,
    faExpand, faBan, faClipboardList,
} from "@fortawesome/free-solid-svg-icons";

library.add(
    faArrowAltCircleUp, faArrowUp, faCog, faEdit, faEllipsisV,
    faEye, faEyeSlash, faList, faPause, faStop, faPlay, faPlus,
    faSearch, faTachometerAlt, faTimes, faTimesCircle, faTrash,
    faCheckCircle, faStream, faSave, faExclamationCircle, faBullhorn,
    faArrowsAltV, faUnlink, faQuestionCircle, faImages, faUpload,
    faCopy, faCheck, faFile, faAward, faLink, faChevronDown,
    faChevronRight, faChevronUp, faSignOutAlt, faPen,
    faExternalLinkSquareAlt, faSpinner, faUndo, faPlusCircle,
    faAngleDown, faWrench, faHeartbeat, faFilter, faInfoCircle,
    faClone, faCertificate, faTerminal, faWarehouse, faHome,
    faRocket, faRotate, faCloudArrowDown, faArrowsRotate, faFileText,
    faFileImport, faChevronCircleRight, faChevronCircleDown,
    faExpand, faBan, faClipboardList,
);

export function getIconHtml(name: string, extraClass = ""): string {
    const result = faIcon({ prefix: "fas",
        iconName: name as IconName });
    if (!result) {
        return "";
    }
    const svg = result.html[0];
    if (!extraClass) {
        return svg;
    }
    return svg.replace("<svg ", `<svg class="${extraClass}" `);
}
