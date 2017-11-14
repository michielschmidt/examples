var boekingsCal                     = {};
boekingsCal.code                    = 0;
boekingsCal.numberRowsVisible       = 0;
boekingsCal.prevMonthDisabled       = true;
boekingsCal.nextMonthDisabled       = false;
boekingsCal.numSelectDays           = 7;
boekingsCal.calElement              = false;
boekingsCal.hasSelection            = false;
boekingsCal.startDay                = false;
boekingsCal.endDay                  = false;
boekingsCal.startDateSelection      = false;
boekingsCal.fetchingInProgress      = false;
boekingsCal.browsingMonths          = false;
boekingsCal.dateClicked             = false;
boekingsCal.data                    = {};
boekingsCal.tripPrices              = {};
boekingsCal.lang                    = [];
boekingsCal.lang["retrieveData"]    = "Actuele reisdata worden opgehaald.";
boekingsCal.lang["retrievePrice"]   = "Actuele prijs van deze accommodatie wordt opgehaald.";
boekingsCal.lang["invalidPeriod"]   = "Er kan helaas geen beschikbare periode worden gekozen bij deze aankomstdatum.";
boekingsCal.days    = {};
boekingsCal.days[0] = "Zondag";
boekingsCal.days[1] = "Maandag";
boekingsCal.days[2] = "Dinsdag";
boekingsCal.days[3] = "Woensdag";
boekingsCal.days[4] = "Donderdag";
boekingsCal.days[5] = "Vrijdag";
boekingsCal.days[6] = "Zaterdag";   


function generateBoekingsCalendar(code)
{
    if(code != undefined)
    {
        boekingsCal.code = code;
        
        $.ajax(
        {
            type: "get",
            url: "xmlHttp.php?task=vacancy&code="+boekingsCal.code,
            success: function(responseText)
            {
                if(responseText)
                {
                    var response = eval('('+responseText+')');
                    if(response.success == true)
                    {
                        boekingsCal.startDay = new Date(response.start_date);
                        boekingsCal.endDay = new Date(response.end_date);
                        boekingsCal.data = response.data;
                                                                      
                        var calDay;                       
                        if(boekingsCal.lastSelectionStartDate != undefined)
                        {
                            calDay = new Date(boekingsCal.lastSelectionStartDate);
                            
                            boekingsCal.numSelectDays = boekingsCal.lastSelectionNumDays;
                            
                            delete boekingsCal.lastSelectionNumDays;
                            delete boekingsCal.lastSelectionStartDate;
                        }else
                        {                                    
                            calDay = boekingsCal.startDay;
                        }
                                               
                        boekingsCal.calendar = $("#jCalTarget").jCal({
                            day:            calDay,
                            days:           1,
                            showMonths:     4,
                            dayOffset:      1,
                            dow:            ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'],
                            monthSelect:    false,
                            callback:       function (day, days, e)
                            {
                                boekingsCal.calElement = e;
                                var dateString = day.asString("yyyy-mm-dd");
                                if(boekingsCal.data != undefined && (boekingsCal.data[dateString] != undefined))
                                {
                                    var vac = boekingsCal.data[dateString];
                                    // check changeover
                                    if(vac.co == 1)
                                    {
                                        selectStartDate(day);                                                                                
                                    }
                                }
                            },
                            drawBack: function()
                            {
                                var el = document.getElementById("prevMonth");
                                el.style.display = (boekingsCal.prevMonthDisabled) ? "none" : "block";
                                
                                el = document.getElementById("nextMonth");
                                el.style.display = (boekingsCal.nextMonthDisabled) ? "none" : "block";
                                                                
                                if(boekingsCal.calElement && boekingsCal.browsingMonths)
                                {
                                    selectDays();
                                }
                                
                                boekingsCal.browsingMonths = false;
                            },
                            dCheck: function(date)
                            {
                                if(date <= boekingsCal.startDay)
                                {                                    
                                    if(!boekingsCal.prevMonthDisabled)
                                    {                                     
                                        boekingsCal.prevMonthDisabled = true;
                                    }
                                    
                                    return false;
                                }else
                                if(date >= boekingsCal.endDay)
                                {                                    
                                    if(!boekingsCal.nextMonthDisabled)
                                    {
                                        boekingsCal.nextMonthDisabled = true;
                                    }
                                    
                                    return false;
                                }                               
                                                                
                                var dateString = date.asString("yyyy-mm-dd");                                                                
                                if(boekingsCal.data != undefined && (boekingsCal.data[dateString] != undefined))
                                {
                                    var vac = boekingsCal.data[dateString];
                                    // check availability
                                    if(vac.av == 1)
                                    {                                
                                        if(vac.so == 0)
                                        {
                                            // check changeover
                                            if(vac.co == 1)
                                            {
                                                return 'dayVacantArrival';
                                            }else
                                            {
                                                return 'dayVacantNoArrival';
                                            }
                                        }else
                                        {
                                            // check changeover
                                            if(vac.co == 1)
                                            {
                                                return 'dayVacantArrivalAction';
                                            }else
                                            {
                                                return 'dayVacantNoArrivalAction';
                                            }
                                        }                                            
                                    }else
                                    {
                                        if(vac.so == 0)
                                        {
                                            return 'invday';
                                        }else
                                        {
                                            return 'invdayAction';
                                        }
                                            
                                    }
                                }

                                return 'day';
                            }
                        });                   
                    }else
                    {
                        //$("#jCalTarget").html(response.data);
                        boekingsCal.calendar = $("#jCalTarget").jCal({
                            day:            calDay,
                            days:           1,
                            showMonths:     4,
                            dayOffset:      1,
                            dow:            ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'],
                            monthSelect:    false,                        
                        });
                        //var el_legenda = document.getElementById("jCalLegenda");
                        //el_legenda.style.display = "none";
                    }
                }
            }
        });
    }
}

function selectDay(selectDay)
{
    var id = (selectDay.getMonth() + 1) + '_' + selectDay.getDate() + '_' + selectDay.getFullYear();       
    
    var el = document.getElementById("c4d_" + id);            
    if(el)
    {    
        $('#jCalTarget div[id*=' + id + ']').removeClass('selectedDay').addClass('selectedDay');
        
        return true;
    }else
    {
        // element does not exist, day invisible
        return false;
    }
} 

function deselectDay(selectDay)
{
    $('#jCalTarget div[id*=' + (selectDay.getMonth() + 1) + '_' + selectDay.getDate() + '_' + selectDay.getFullYear() + ']').removeClass('selectedDay');
}

function selectDays()
{    
    var day = new Date(boekingsCal.startDateSelection);
    var strDay;
    
    if(boekingsCal.numSelectDays)
    {
        for(var i=0, visible=true; i<boekingsCal.numSelectDays; i++)
        {            
            if(i > 0)
            {
                // set next day
                day.setDate(day.getDate()+1);
            }           
        
            visible = selectDay(day);            
            if(!visible && !boekingsCal.browsingMonths)
            {
                // day in selection not shown on visible calendars, scroll to next months

                // reset date to first day of selection
                day.setDate(day.getDate()-i);
                            
                // reset vars
                boekingsCal.prevMonthDisabled = false;
                boekingsCal.nextMonthDisabled = false;

                // render calendars with new startday (first day of selection)
                $(boekingsCal.calElement.data._target).jCal( $.extend(boekingsCal.calElement.data, {day:day}));
                
                // reselect days of selection
                selectDays();
                
                return true;
            }
        }                  
                 
        boekingsCal.hasSelection = true;                
        
        strDay = boekingsCal.startDateSelection.asString("d-m-yyyy");
        $("#tripSelection").html(strDay + " voor " + boekingsCal.numSelectDays + " nachten");
        
        day.setDate(day.getDate()+1);
        strDay = day.asString("yyyy-mm-dd");
        if((boekingsCal.tripPrices[strDay] != undefined))
        {
            $('#date_end').val(strDay); 
            
	    if(boekingsCal.tripPrices[strDay])
            {                
                $("#tripPrice").html("&euro; "  + boekingsCal.tripPrices[strDay]);
                
                showBookingButton();
            }else
            {
                $("#tripPrice").html("Er kon voor deze periode geen prijs worden opgehaald.");                
            } 
        }      
    }          
}

function clearSelection()
{
    var day = new Date(boekingsCal.startDateSelection);
    deselectDay(day);
        
    for(var i=1; i<boekingsCal.numSelectDays; i++)
    {
        // set previous day
        day.setDate(day.getDate()+1);               
        
        deselectDay(day);
    }
    
    boekingsCal.hasSelection = false;
}

function getPrices(strDay)
{           
    $.ajax(
    {
        type: "post",
        url: "xmlHttp.php?task=prices&code="+boekingsCal.code,
        data: "startDate="+strDay+"&numDays="+boekingsCal.numSelectDays,
        success: function(responseText)
        {
            if(responseText)
            {
                var response = eval('('+responseText+')');
                               
                if(response.numDays != undefined)
                {
                    boekingsCal.numSelectDays = response.numDays;
                }
                                
                if(response.success == true)
                {
                    $("#tripDuration").html(response.output);                                                            
                    
                    boekingsCal.tripPrices = response.prices;

                    selectDays();
                }else
                {
                    $("#tripDuration").html("");
                    $("#tripPrice").html(boekingsCal.lang["invalidPeriod"]); 
                   
                    // invalid period, deselect selection?
                }
            }

            boekingsCal.fetchingInProgress = false;
        }
    }); 
}

function selectStartDate(day)
{               
    if(!boekingsCal.fetchingInProgress)
    {        
        hideBookingButton();
        
        var strDay = day.asString("yyyy-mm-dd");        
        if(boekingsCal.startDateSelection)
        {            
            var strSelectionStartDay = boekingsCal.startDateSelection.asString("yyyy-mm-dd");
        }

        if(strSelectionStartDay == undefined || (strSelectionStartDay != strDay))
        {
            boekingsCal.fetchingInProgress = true;
            boekingsCal.startDateSelection = new Date(strDay);  
            
            $('#date_start').val(strDay);
                                    
            $("#tripDuration").html(boekingsCal.lang["retrieveData"]);          
            $("#tripPrice").html(boekingsCal.lang["retrievePrice"]);
            $("#tripSelection").html("");                        
            
            getPrices(strDay, true);
            
        }else
        if(strSelectionStartDay == strDay)
        {
            selectDays();
        }
    }else
    {
        boekingsCal.dateClicked = true;
        
        // deselect clicked day
        deselectDay(day);
    }
}

function setTripDuration(num, override)
{
    if(num >= 0)
    {
        if(num != boekingsCal.numSelectDays || override)
        {
            var cleared = false;
            if(boekingsCal.hasSelection)
            {
                cleared = true;                
                clearSelection();
            }
            
            boekingsCal.numSelectDays = num;
                             
            var strDay = boekingsCal.startDateSelection.asString("yyyy-mm-dd");                            
            
            if(cleared)
            {            
                selectDays();  
            }
        }
    }
}

function goToBooking()
{
    var dateStart = $('#date_start').val();
    var dateEnd = $('#date_end').val();        
    
    return false;
}
