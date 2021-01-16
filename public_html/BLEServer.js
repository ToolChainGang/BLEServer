////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// BLEServer.js - Javascript for BLEServer pages
//
// Copyright (C) 2020 Peter Walsh, Milford, NH 03055
// All Rights Reserved under the MIT license as outlined below.
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
//  MIT LICENSE
//
//  Permission is hereby granted, free of charge, to any person obtaining a copy of
//    this software and associated documentation files (the "Software"), to deal in
//    the Software without restriction, including without limitation the rights to
//    use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
//    of the Software, and to permit persons to whom the Software is furnished to do
//    so, subject to the following conditions:
//
//  The above copyright notice and this permission notice shall be included in
//    all copies or substantial portions of the Software.
//
//  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
//    INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
//    PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
//    HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
//    OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
//    SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// BLEInfo                                             # Data supplied by this server
//     ->{Timeout}                                     # Timeout in seconds for commands (DEFAULT: 10)
//     ->{Hostname}                                    # System name (from /etc/hostname)
//     ->{IFaces}                                      # Available BLE interfaces
//         ->{$IF}                                     # Interface to scan     (ex: "hci0")
//             ->{IFace  }                             # Name of interface   (same as hash key)
//             ->{Address}                             # Address of interface
//             ->{Running}                             # TRUE if up and running
//             ->{State}                               # "Open", "Closed", "Scanning"
//             ->{Devs}                                # Scanned devices
//                 ->{$Dev}                            # BLE device ID                 (ex: "84:2E:14:87:66:97")
//                     ->{ID}                          # Device ID                     (same as hash key)
//                     ->{Name}                        # Name of device                (ex: "Jovan Heart Monitor")
//                     ->{Names}[]                     # Array of names returned in scan
//                     ->{State}                       # "Open", "Closed", "Scanning"
//                     ->{Services}                    # Services available
//                         ->{$UUID}                   # UUID of service               (ex: "00001801-0000-1000-8000-00805f9b34fb")
//                             ->{UUID}                # Service UUID                  (same as hash key)
//                             ->{Service}             # First 8 hex digits of UUID    (ex: "00001801")
//                             ->{HDStart}             # Start of characteristics
//                             ->{HDEnd}               # End   of characteristics
//                             ->{State}               # "Open", "Closed", "Scanning"
//                             ->{Chars}               # List of available characteristics
//                                 ->{$Char}           # Handle for this char          (ex: "0002")
//                                     ->{Handle}      # Handle                        (same as hash key)
//                                     ->{VHandle}     # Handle for value
//                                     ->{Properties}  # R/W, etc
//                                     ->{UUID}        # Full UUID of characteristic   (ex: "00001801-0000-1000-8000-00805f9b34fb")
//                                     ->{Service}     # First 8 digits of char UUID   (ex: "00001801")
//                                     ->{State}       # "Open", "Closed", "Scanning"
//
// In what follows: $TYPE  Is the type of the directory (ex: "IF")
//                  $DIR   Is the name of the directory (ex: "hci0", which is of yupe IF
//
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

    var ConfigSystem = location.hostname;
    var ConfigAddr   = "ws:" + ConfigSystem + ":2021";

    var ConfigSocket;
    var ConfigData;

    var WindowWidth;
    var WindowHeight;

    var BLEInfo;
    var PrevBLEInfo;
    var Populated = 0;      // TRUE if web page tables populated from GPIOInfo

    //
    // Directory list line
    //
    DirLine = '\
        <input type="checkbox" $OPEN id="$DIRInput" onclick="Toggle$TYPE($PATH)" />   \
        <label class="tree_label" for="$DIRInput">$DIR</label>';

    //
    // "Scanning" mode line
    //
    var ScanningLine = '\
        <ul><li><span class="tree_label">Scanning...</span></li></ul>';

// <ul class="tree">
//   <li>
//     <input type="checkbox" checked="checked" id="c1" />
//     <label class="tree_label" for="c1">Level 0</label>
//     <ul>
//       <li>
//         <input type="checkbox" checked="checked" id="c2" />
//         <label for="c2" class="tree_label">Level 1</label>
//         <ul>
//           <li><span class="tree_label">Level 2</span></li>
//           <li><span class="tree_label">Level 2</span></li>
//         </ul>
//       </li>
//       <li>
//         <input type="checkbox" id="c3" />
//         <label for="c3" class="tree_label">Looong level 1 <br/>label text <br/>with line-breaks</label>
//         <ul>
//           <li><span class="tree_label">Level 2</span></li>
//           <li>
//             <input type="checkbox" id="c4" />
//             <label for="c4" class="tree_label"><span class="tree_custom">Specified tree item view</span></label>
//             <ul>
//               <li><span class="tree_label">Level 3</span></li>
//             </ul>
//           </li>
//         </ul>
//       </li>
//     </ul>
//   </li>




    //
    // On first load, calculate reliable page dimensions and do page-specific initialization
    //
    window.onload = function() {
        //
        // (This crazy nonsense gets the width in all browsers)
        //
        WindowWidth  = window.innerWidth  || document.documentElement.clientWidth  || document.body.clientWidth;
        WindowHeight = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight;

        PageInit();     // Page specific initialization

        Populated = 0;
        ConfigConnect();
        }

    //
    // Send a command to the server
    //
    function ServerCommand(Command,Arg1,Arg2,Arg3,Arg4,Arg5) {
        ConfigSocket.send(JSON.stringify({
            "Type"  : Command,
            "Arg1"  : Arg1,
            "Arg2"  : Arg2,
            "Arg3"  : Arg3,
            "Arg4"  : Arg4,
            "Arg5"  : Arg5,
             }));
        }

    function ConfigConnect() {
        ConfigSocket = new WebSocket(ConfigAddr);
        ConfigSocket.onmessage = function(Event) {
            ConfigData = JSON.parse(Event.data);

//                console.log("Msg: "+Event.data);

            if( ConfigData["Error"] != "No error." ) {
                console.log("Error: "+ConfigData["Error"]);
                console.log("Msg:   "+Event.data);
                alert("Error: " + ConfigData["Error"]);
                return;
                }

            //
            // Most messages return a GPIOInfo struct, which updates the shown values
            //
            if( ConfigData["Type"] == "GetBLEInfo" ) {
//                console.log(BLEInfo);

                BLEInfo = ConfigData.State;
                SetStates(BLEInfo);

                HostnameElements = document.getElementsByClassName("Hostname");
                for (i = 0; i < HostnameElements.length; i++) {
                    HostnameElements[i].innerHTML = BLEInfo.Hostname;
                    };

                DisplayBLEInfo();
                GotoPage("MainPage");
                return;
                }

            if( ConfigData["Type"] == "ScanDevs"     ||
                ConfigData["Type"] == "ScanServices" ||
                ConfigData["Type"] == "ScanChars"    ) {
                console.log("Msg: "+Event.data);

                BLEInfo = ConfigData.State;
                SetStates(BLEInfo);
                DisplayBLEInfo();
                }

            //
            // Unexpected messages
            //
            console.log(ConfigData);
            alert(ConfigData["Type"] + " received");
            };

        ConfigSocket.onopen = function(Event) {
            GotoPage("ConnectingPage");
            ServerCommand("GetBLEInfo");
            }
        };

    //
    // Cycle through the various pages
    //
    function GotoPage(PageName) {

        Pages = document.getElementsByClassName("PageDiv");

        for (i = 0; i < Pages.length; i++) {
            Pages[i].style.display = "none";
            };

        if( PageName == "MainPage"   ) { PopulateMainPage  (); }
        if( PageName == "ConfigPage" ) { PopulateConfigPage(); }

        document.getElementById(PageName).style.display = "block";

        };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // PopulateMainPage - Populate the landing page as needed
    //
    function PopulateMainPage() { DisplayBLEInfo(); }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // PopulateGPIOConfigPage - Populate the configuration page as needed
    //
    function PopulateConfigPage() {}

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Open - Open up a directory
    //
    function PopulateConfigPage() {}

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // SetStates - Set all BLEInfo State vars
    //
    // Inputs:  BLEInfo to set
    //
    // Outputs: None. Dir.State is set in the passed BLEInfo
    //
    function SetStates(BLEInfo) {

        Object.keys(BLEInfo.IFaces).forEach(function (IF) { 

            if( SetState(BLEInfo.IFaces[IF],
                         BLEInfo.IFaces[IF].Devs) )
                return;

            Object.keys(BLEInfo.IFaces[IF].Devs).forEach(function (Dev) { 

                if( SetState(BLEInfo.IFaces[IF].Devs[Dev],
                             BLEInfo.IFaces[IF].Devs[Dev].Services) )
                    return;

                Object.keys(BLEInfo.IFaces[IF].Devs[Dev].Services).forEach(function (Serv) { 

                    if( SetState(BLEInfo.IFaces[IF].Devs[Dev].Services[Serv],
                                 BLEInfo.IFaces[IF].Devs[Dev].Services[Serv].Chars) )
                        return;

                    });
                });
            });
        }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // SetState - Set Dir state to known value
    //
    // Inputs:  Directory to set (an IF, Dev, Service, or Char)
    //          Subdir of directory
    //
    // Outputs: 0 if subdir contains entries to be processed
    //          1 if subdir is undefined (or empty) and recursive processing should be skipped.
    //
    function SetState(Dir,Arr) {

        if( typeof Dir.State === 'undefined' )
            Dir.State = 'Closed';

        if( typeof Arr === 'undefined' )
            return 1;

        if( Dir.State === 'Scanning' && Object.keys(Arr).length > 0 )
            Dir.State = "Open";

        return Object.keys(Arr).length == 0;
        }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // ToggleState - Toggle one individual state var
    //
    // Inputs:  Directory to toggle (an IF, Dev, Service, or Char)
    //
    // Outputs: None. State is changed in place.
    //
    function ToggleState(Dir) {

        if     ( Dir.State === "Closed"   ) { Dir.State = 'Open'  ; }
        else if( Dir.State === "Open"     ) { Dir.State = 'Closed'; }
        else if( Dir.State === "Scanning" ) { Dir.State = 'Closed'; }
        }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // ToggleIF - Toggle an interface dir
    //
    // Inputs:  IF to toggle
    //
    // Outputs: None. State is changed in place.
    //
    function ToggleIF(IF) {

        ToggleState(BLEInfo.IFaces[IF]);

        if( BLEInfo.IFaces[IF].State === "Open" && typeof BLEInfo.IFaces[IF].Devs == "undefined" ) {
            BLEInfo.IFaces[IF].State === "Scanning";
            ServerCommand("ScanDevs",IF);
            }

        DisplayBLEInfo();
        }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // ToggleDev - Toggle a device listing
    //
    // Inputs:  IF  of device
    //          Dev to toggle
    //
    // Outputs: None. State is changed in place.
    //
    function ToggleDev(IF,Dev) {

        ToggleState(BLEInfo.IFaces[IF].Devs[Dev]);

        if(        BLEInfo.IFaces[IF].Devs[Dev].State    === "Open"      && 
            typeof BLEInfo.IFaces[IF].Devs[Dev].Services === "undefined" ) {
            BLEInfo.IFaces[IF].Devs[Dev].State === "Scanning";
            ServerCommand("ScanServices",IF,Dev);
            }

        DisplayBLEInfo();
        }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // ToggleServ - Toggle a service listing
    //
    // Inputs:  IF  of device
    //          Device
    //          Service to toggle
    //
    // Outputs: None. State is changed in place.
    //
    function ToggleServ(IF,Dev,Serv) {

        ToggleState(BLEInfo.IFaces[IF].Devs[Dev].Services[Serv]);

        if(        BLEInfo.IFaces[IF].Devs[Dev].Services[Serv].State === "Open"     && 
            typeof BLEInfo.IFaces[IF].Devs[Dev].Services[Serv].Chars === "undefined" ) {
            BLEInfo.IFaces[IF].Devs[Dev].Services[Serv].State === "Scanning";
            ServerCommand("ScanChars",IF,Dev,Serv);
            }

        DisplayBLEInfo();
        }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // DisplayBLEInfo - Display the BLE info tree
    //
    function DisplayBLEInfo() {

        var HTML = IFTable();

        document.getElementById("IFTable").innerHTML = HTML;                   // Always exists
        }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // IFTable - Display the HTML for the IF table
    //
    function IFTable() {

        var HTML = "";          // <ul> already exists in the page

        Object.keys(BLEInfo.IFaces).forEach(function (IF) { 

            var State = BLEInfo.IFaces[IF].State;

            if( State === 'Scanning' &&
                Object.keys(BLEInfo.IFaces[IF].Devs).length > 0 )
                State = "Open";

            HTML += '<li>';
            HTML += DirLine.replaceAll("$TYPE","IF")
                           .replaceAll("$DIR" ,IF)
                           .replaceAll("$PATH","'" + IF + "'")
                           .replaceAll("$OPEN",State === "Scanning" || State === "Open" ? "checked" : "");

            if( State === 'Scanning' ) HTML += ScanningLine;
            if( State === 'Open'     ) HTML += DevTable(IF);

            HTML += "</li>";
            });

        return HTML;
        }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // DevTable - Return HTML of Device table for specific interface
    //
    // Inputs:  IFace of interest
    //
    // Outputs: Stringified HTML code for Dev table of IFace
    //
    function DevTable(IF) {

        var HTML = "<ul>";

        Object.keys(BLEInfo.IFaces[IF].Devs).forEach(function (Dev) { 

            var State = BLEInfo.IFaces[IF].Devs[Dev].State;

            if( typeof State === 'Scanning' &&
                Object.keys(BLEInfo.IFaces[IF].Devs[Dev].Services).length > 0 )
                State = "Open";

            HTML += '<li>';
            HTML += DirLine.replaceAll("$TYPE","Dev")
                           .replaceAll("$DIR" ,Dev)
                           .replaceAll("$PATH","'" + IF + "','" + Dev + "'")
                           .replaceAll("$OPEN",State === "Scanning" || State === "Open" ? "checked" : "");

            if( State === 'Scanning' ) HTML += ScanningLine;
            if( State === 'Open'     ) HTML += ServTable(IF);

            HTML += "</li>";
            });

        HTML += "</ul>";

        return HTML;
        }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // ServTable - Return HTML of Services table for specific interface and device
    //
    // Inputs:  IFace of interest
    //          Dev   of interest
    //
    // Outputs: Stringified HTML code for Services table for device
    //
    function ServTable(IF,Dev) {

        var HTML = "<ul>";

        Object.keys(BLEInfo.IFaces[IF].Devs[Dev].Services).forEach(function (Serv) { 

            var State = BLEInfo.IFaces[ID].Devs[Dev].Services[Serv].State;

            if( typeof State === 'Scanning' &&
                Object.keys(BLEInfo.IFaces[IF].Devs[Dev].Services[Serv].Chars).length > 0 )
                State = "Open";

            HTML += '<li>';
            HTML += DirLine.replaceAll("$TYPE","Dev")
                           .replaceAll("$DIR" ,Dev)
                           .replaceAll("$PATH","'" + IF + "','" + Dev + "','" + Serv + "'")
                           .replaceAll("$OPEN",State === "Scanning" || State === "Open" ? "checked" : "");

            if( State === 'Scanning' ) HTML += ScanningLine;
            if( State === 'Open'     ) HTML += CharTable(IF);

            HTML += "</li>";
            });

        HTML += "</ul>";

        return HTML;
        }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // CharTable - Return HTML of characteristics table for specific interface
    //
    // Inputs:  IFace   of interest
    //          Dev     of interest
    //          Service of interest
    //
    // Outputs: Stringified HTML code for Characteristics table for device
    //
    function CharTable(IF,Dev,Serv) {

        var HTML = "<ul>";

        Object.keys(BLEInfo.IFaces[IF].Devs[Dev].Services[Serv].Chars).forEach(function (Char) { 

            var State = BLEInfo.IFaces[ID].Devs[Dev].Services[Serv].Chars[Char].State;

//             if( typeof State === 'Scanning' &&
//                 Object.keys(BLEInfo.IFaces[IF].Devs[Dev].Services[Serv].Chars[Char].).length > 0 )
//                 State = "Open";

            HTML += '<li>';
            HTML += DirLine.replaceAll("$TYPE","Dev")
                           .replaceAll("$DIR" ,Dev)
                           .replaceAll("$PATH",'"' + IF + "','" + Dev + "','" + Serv + "','" + Char + "'")
                           .replaceAll("$OPEN",State === "Scanning" || State === "Open" ? "checked" : "");

//             if( State === 'Scanning' ) HTML += ScanningLine;
//             if( State === 'Open'     ) HTML += CharTable(IF);

            HTML += "</li>";
            });

        HTML += "</ul>";

        return HTML;
        }
