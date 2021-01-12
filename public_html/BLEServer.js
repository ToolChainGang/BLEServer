////////////////////////////////////////////////////////////////////////////////
//
// BLEServer.js - Javascript for BLEServer pages
//
// Copyright (C) 2020 Peter Walsh, Milford, NH 03055
// All Rights Reserved under the MIT license as outlined below.
//
////////////////////////////////////////////////////////////////////////////////
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
////////////////////////////////////////////////////////////////////////////////
//
// $BLEInfo                                            # Data supplied by this server
//     ->{Timeout}                                     # Timeout in seconds for commands (DEFAULT: 10)
//     ->{Hostname}                                    # System name (from /etc/hostname)
//     ->{IFaces}                                      # Available BLE interfaces
//         ->{$IF}                                     # Interface to scan     (ex: "hci0")
//             ->{IFace  }                             # Name of interface   (same as hash key)
//             ->{Address}                             # Address of interface
//             ->{Running}                             # TRUE if up and running
//             ->{Devs}                                # Scanned devices
//                 ->{$Dev}                            # BLE device ID                 (ex: "84:2E:14:87:66:97")
//                     ->{ID}                          # Device ID                     (same as hash key)
//                     ->{Name}                        # Name of device                (ex: "Jovan Heart Monitor")
//                     ->{Names}[]                     # Array of names returned in scan
//                     ->{Services}                    # Services available
//                         ->{$UUID}                   # UUID of service               (ex: "00001801-0000-1000-8000-00805f9b34fb")
//                             ->{UUID}                # Service UUID                  (same as hash key)
//                             ->{Service}             # First 8 hex digits of UUID    (ex: "00001801")
//                             ->{HDStart}             # Start of characteristics
//                             ->{HDEnd}               # End   of characteristics
//                             ->{Chars}               # List of available characteristics
//                                 ->{$Char}           # Handle for this char          (ex: "0002")
//                                     ->{Handle}      # Handle                        (same as hash key)
//                                     ->{VHandle}     # Handle for value
//                                     ->{Properties}  # R/W, etc
//                                     ->{UUID}        # Full UUID of characteristic   (ex: "00001801-0000-1000-8000-00805f9b34fb")
//                                     ->{Service}     # First 8 digits of char UUID   (ex: "00001801")
//
//
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
                console.log("Msg: "+Event.data);

                BLEInfo = ConfigData.State;
//                console.log(GPIOInfo);

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

        DisplayBLEInfo();
        };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // PopulateMainPage - Populate the landing page as needed
    //
    function PopulateMainPage() {}

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // PopulateGPIOConfigPage - Populate the configuration page as needed
    //
    function PopulateConfigPage() {}

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // DisplayBLEInfo - Display the BLE info tree
    //
    function DisplayBLEInfo() {

        var BLETree = document.getElementById("BLETree");
        console.log(BLETree);

        var Tree = webix.ui({
            container:  "BLETree",
            view:"tree",
            data: [
                {id:"root", value:"Cars", open:true, data:[
                    { id:"1", open:true, value:"Toyota", data:[
                        { id:"1.1", value:"Avalon" },
                        { id:"1.2", value:"Corolla" },
                        { id:"1.3", value:"Camry" }
                        ]},
                    { id:"2", open:true, value:"Skoda", data:[
                        { id:"2.1", value:"Octavia" },
                        { id:"2.2", value:"Superb" }
                        ]}
                    ]}
                ]
            });

        Tree.add({value:BLEInfo.IFaces[0]}, 0);
        }
