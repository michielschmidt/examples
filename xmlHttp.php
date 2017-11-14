<?php

function getVacancyDate($code, &$startDate, &$endDate, $selectedDate=0)
{
    global $zetnl, $zetus, $numbers_of_maximum_stay;
            
    $vacancy = array();
            
    $sql = "SELECT * FROM product_periode WHERE productID=".intval($code);
    if($selectedDate)
    {
        $sql .= " AND tot >= '".$selectedDate."'";
    }
    $sql .= " ORDER BY tot";
        
    $res = mysql_query($sql);
    if($res && mysql_num_rows($res))
    {                                
        $periodes = array();
        while($periode = mysql_fetch_assoc($res))
        {                    
            $aantaldagen = date("z",strtotime('+'.preg_replace($zetnl,$zetus,$periode['stay'])) - time());                    

            $periodeVan = ($selectedDate && $selectedDate > $periode["van"]) ? $selectedDate : $periode["van"];           
            $periodes[$periode["tot"]] = array(
                "van"   => $periodeVan, 
                "dagen" => $aantaldagen,
                "week"  => $periode["week"],
                "night" => $periode["night"],
                "id"    => $periode["periodeID"]
            );
        }

        $availability = array();
        foreach($periodes as $periodeEndDate => $periode)
        {                                
            $availabilityDateStart  = new DateTime($periode["van"]);
            $availabilityDateEnd    = new DateTime($periodeEndDate);                   
            $availabilityDateEnd->add(new DateInterval('P1D'));
            $availabilityPeriod     = new DatePeriod($availabilityDateStart, new DateInterval('P1D'), $availabilityDateEnd);
            foreach($availabilityPeriod as $availabilityDay)
            {
                $availability[$availabilityDay->format("Y-m-d")] = array
                (
                    "dagen" => $periode["dagen"],
                    "week"  => $periode["week"],                    
                    "night" => $periode["night"],
                    "PID"   => $periode["id"],
                );
            }
        }                              
        
        $startDate  = ($selectedDate) ? $selectedDate : date("Y-m-d");
        // get last end date
        end($periodes);
        $endDate    = key($periodes);
        
        $vacancyDateStart  = new DateTime($startDate);
        $vacancyDateEnd    = new DateTime($endDate);                   
        $vacancyDateEnd->add(new DateInterval('P1D'));
        $vacancyPeriod     = new DatePeriod($vacancyDateStart, new DateInterval('P1D'), $vacancyDateEnd);
        foreach($vacancyPeriod as $vacancyDay)
        {
            $day = array();

            $date = $vacancyDay->format("Y-m-d");

            $day["av"] = isset($availability[$date]) ? 1 : 0;                        

            if($selectedDate && $day["av"] == 0)
            {
                // adjust last end date
                end($vacancy);
                $endDate = key($vacancy);
                break;                
            }
            
            $day["co"]  = 1;
            $day["so"]  = 0;
            $day["min"] = isset($availability[$date]["dagen"]) ? intval($availability[$date]["dagen"]) : 0;
                        
            if($selectedDate)
            {
                $day["max"]         = $numbers_of_maximum_stay;
                $day["week_price"]  = $availability[$date]["week"];
                $day["night_price"] = $availability[$date]["night"];
                $day["PID"]         = $availability[$date]["PID"];
            }

            $vacancy[$date] = $day;            
        }
    }
    
    $vacancy = calculateVacancyPeriodes($vacancy);
    
    return $vacancy;
}

function calculateVacancyPeriodes($vacancy=array())
{
    global $numbers_of_maximum_stay;
    
    if(count($vacancy))
    {
        foreach($vacancy as $date => $day)
        {
            if(($day["av"] == 1) && ($day["min"] > 1))
            {
                for($i=1, $vacant=true; $i<$numbers_of_maximum_stay && $vacant; $i++)
                {
                    $vacancyDate = new DateTime($date);
                    $vacancyDate->add(new DateInterval('P'.$i.'D'));
                    
                    $datePeriod = $vacancyDate->format("Y-m-d");
                    
                    if(!isset($vacancy[$datePeriod]) || ($vacancy[$datePeriod]["av"] == 0))
                    {
                        if($i < $day["min"])
                        {
                            $vacancy[$date]["av"]   = 0;
                            $vacancy[$date]["co"]   = 0;
                            $vacancy[$date]["min"]  = 0;
                        }else
                        if($i == $day["min"])
                        {
                            $vacant=false;
                            
                            $vacancy[$date]["av"]   = 1;
                            $vacancy[$date]["max"]  = $vacancy[$date]["min"];
                        }else
                        {
                            $vacant=false;
                            
                            $vacancy[$date]["av"]   = 1;                            
                            $vacancy[$date]["max"]  = $i;                                                        
                        }
                    }                                        
                }
            }
        }
    }
    
    return $vacancy;
}

function calculatePrices($vacancy=array(), $selectedDate='', $valid_durations=array())
{
    $prices = array();
    
    if(count($vacancy) && count($valid_durations) && $selectedDate)
    {    
        $startDate = new DateTime($selectedDate);              
        
        foreach($valid_durations as $date => $days)
        {
            $periodPrice    = 0;
            $endDate        = new DateTime($date);            
            $interval       = $startDate->diff($endDate);
            $diff_days      = intval($interval->format('%a'));
            
            for($i=0; $i<$diff_days; $i++)
            {
                $calcDate = new DateTime($selectedDate);
                $calcDate->add(new DateInterval('P'.$i.'D'));
                
                $periodPrice += $vacancy[$calcDate->format("Y-m-d")]["night_price"];                
            }
                        
            $num_weeks = floor($diff_days / 7);                
            $num_days = $diff_days % 7;                
            if($num_weeks)
            {
                $periodPrice = 0;                    
                for($i=0; $i<$diff_days; $i++)
                {                  
                    $loopDate = new DateTime($selectedDate);
                    $loopDate->add(new DateInterval('P'.$i.'D'));                        
                    $loopDateFormat = $loopDate->format("Y-m-d");                                

                    if(($i+6) < $diff_days)
                    {
                        $calcDate = new DateTime($loopDateFormat);                        
                        $calcDate->add(new DateInterval('P6D'));                        
                        if($vacancy[$loopDateFormat]["PID"] == $vacancy[$calcDate->format("Y-m-d")]["PID"])
                        {
                            // week price
                            $periodPrice += $vacancy[$loopDateFormat]["week_price"];

                            // skip next 6 days, since we use the weekprice from $loopDate
                            $i+=6;
                        }else
                        {
                            $periodPrice += $vacancy[$loopDateFormat]["night_price"];
                        }
                    }else 
                    {
                        $periodPrice += $vacancy[$loopDateFormat]["night_price"];                            
                    }
                }
            }
            
            $prices[$date] = number_format((float)$periodPrice, 2, ',', '');          
        }
    }
        
    return $prices;
}

?>