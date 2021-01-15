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
    // Closed/Open icons
    //
    var Triangles = { Open: "▼", Closed: "▶", Scanning: "▼" };
    var OpenClose = '<span class="Triangle"><a onclick=Toggle$TYPE("$DIR","$OC") >$TRI</a> </span>';

    //
    // Generic table pattern for directory entries
    //
    var DTableHeader = '<table id="$TYPETable" summary="">';
    var DTableFooter = '</table>';
    var DTableLine   = '\
        <tr><td class="LeftIndent">&nbsp;</td>                              \
            <td>$TRI</td>                                                   \
            <td><img class="FolderIcon" src="images/Folder.png" /></td>     \
            <td class="$TYPEName">$DIR</td>                                 \
            <td></td></tr>';

    //
    // Contents when dir is in "Scanning" mode
    //
    var Scanning = '\
            <tr><td class="LeftIndent">&nbsp;</td>                          \
                <td>&nbsp;</td>                                             \
                <td>&nbsp;</td>                                             \
                <td >Scanning...</td></tr>';

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
//                console.log("Msg: "+Event.data);

                BLEInfo = ConfigData.State;
                console.log(BLEInfo);

                HostnameElements = document.getElementsByClassName("Hostname");
                for (i = 0; i < HostnameElements.length; i++) {
                    HostnameElements[i].innerHTML = BLEInfo.Hostname;
                    };

                GotoPage("MainPage");
                return;
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
    // ToggleIF - Toggle an IF between open/close
    //
    function ToggleIF(IF) {
console.log(BLEInfo.IFaces[IF].State);
        BLEInfo.IFaces[IF].State = ToggleState(BLEInfo.IFaces[IF].State);

console.log(BLEInfo.IFaces[IF].State);

//        if( typeof BLEInfo.IFaces[IF].State === 'Scanning' )
//            ServerCommand("ScanDevices",IF);
        DisplayBLEInfo();
        }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // ToggleState - Toggle one individual state var
    //
    function ToggleState(State) {

        if( typeof State === 'undefined' ) {
            State = 'Scanning';
            }
        else {
            if     ( State === "Closed"   ) { State = 'Open'  ; }
            else if( State === "Open"     ) { State = 'Closed'; }
            else if( State === "Scanning" ) { State = 'Closed'; }
            }

        return State;
        }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // DisplayBLEInfo - Display the BLE info tree
    //
    function DisplayBLEInfo() {

        var IFTable = document.getElementById("IFTable");                   // Always exists

        Object.keys(BLEInfo.IFaces).forEach(function (IF) { 

            var State = BLEInfo.IFaces[IF].State;

            if( typeof State === 'undefined' )
                State = "Closed";

            var Triangle = OpenClose.replaceAll("$TYPE","IF")
                                    .replaceAll("$DIR" ,IF)
                                    .replaceAll("$OC"  ,State)
                                    .replaceAll("$TRI" ,Triangles[State]);

            var Data = DTableLine.replaceAll("$TYPE","IF")
                                 .replaceAll("$DIR" ,IF)
                                 .replaceAll("$TRI" ,Triangle);

            if( BLEInfo.IFaces[IF].State === 'Scanning' ) Data += Scanning;
            if( BLEInfo.IFaces[IF].State === 'Open'     ) Data += DevTable(IF);

            IFTable.innerHTML = Data;
            });        
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
        var DevTable = DTableHeader;

        Object.keys(BLEInfo.IFaces[IF].Devs).forEach(function (Dev) { 

            if( typeof BLEInfo.IFaces[IF].Devs[Dev].State === 'undefined' )
                BLEInfo.IFaces[IF].Devs[Dev].State = "Closed";

            var Triangle;

            if( BLEInfo.IFaces[IF].Devs[Dev].State === 'Closed' ) { Triangle = ClosedTriangle; }
            else                                                  { Triangle = OpenedTriangle; }

            Triangle.replaceAll("$TYPE","Dev")
                    .replaceAll("$DIR"  ,Dev.ID);

            var Data = DTableLine.replaceAll("$TYPE"   ,"Dev")
                                 .replaceAll("$TRIANGLE",Triangle)
                                 .replaceAll("$DIR",Dev);

            if( BLEInfo.IFaces[IF].State === 'Scanning' ) Data += Scanning;
            if( BLEInfo.IFaces[IF].State === 'Open'     ) Data += ServTable(IF);

            DevTable.innerHTML += Data;
            });

        DevTable += DTableFooter;

        return DevTable;
        }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // ServTable - Return HTML of Services table for specific interface
    //
    // Inputs:  IFace of interest
    //          Dev   of interest
    //
    // Outputs: Stringified HTML code for Services table for device
    //
    function DevTable(IF) {
        var DevTable = DTableHeader;

        }
